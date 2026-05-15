'use client';

// Client component — collects the buyer's email, mints a Fanbasis
// hosted-redirect SUBSCRIPTION checkout session, and full-page-navigates
// to the upstream payment page. PCI surface stays with Fanbasis: their
// hosted page collects card details; our DOM never touches PAN data.
//
// Why we capture email here (not just on Fanbasis's hosted page): the
// magic-link target post-payment must be the email the buyer typed on
// our surface, not whatever they retype downstream. Sending it through
// the backend → Fanbasis metadata locks the magic-link recipient + the
// pending-subscription drain target before the buyer ever sees the card
// form.

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import {
	TurnstileWidget,
	type TurnstileWidgetHandle,
} from '@/components/auth/turnstile/turnstile-widget';
import { Button } from '@/components/ui/button';
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { createFanbasisPublicSubscriptionCheckout } from '@/services/payment/create-fanbasis-public-subscription-checkout';
import {
	FANBASIS_PUBLIC_SUBSCRIPTION_ERROR_CODES,
	type FanbasisPublicSubscriptionErrorCode,
} from '@/types/errors';

import type { SubscribePlan } from './plans';

// =============================================================================
// FORM SCHEMA
// =============================================================================

/**
 * Email-only client schema. Backend revalidates with `z.email()` of its own,
 * so this is a UX-fast-fail layer — keeps the form from posting a malformed
 * address that the backend would reject after a round-trip.
 */
const creditPurchaseFormSchema = z.object({
	email: z.email('Enter a valid email address'),
});

type CreditPurchaseFormValues = z.infer<typeof creditPurchaseFormSchema>;

// =============================================================================
// ERROR COPY
// =============================================================================

/**
 * Per-code copy for the session-mint failure card. Every
 * `FanbasisPublicSubscriptionErrorCode` must map here so a new backend URN
 * surfaces a real toast instead of falling through to the generic
 * `unknown_error` arm — `error-handling.md` mandates the exhaustive
 * switch with `default: never`.
 *
 * Module-scoped so the lookup table is allocated once, not per render.
 */
const SESSION_ERROR_MESSAGES = {
	[FANBASIS_PUBLIC_SUBSCRIPTION_ERROR_CODES.CHECKOUT_FAILED]:
		"We couldn't reach our payment partner. Please try again in a moment.",
	[FANBASIS_PUBLIC_SUBSCRIPTION_ERROR_CODES.RATE_LIMITED]:
		'Too many checkout attempts. Please wait a minute and retry.',
	// Plan/provider misconfigurations are ops-side issues (slug retired, or
	// the Fanbasis product id was never wired up). Buyer-side retry won't
	// help, but a generic "try again" toast is the right surface — Sentry
	// captures the URN for the on-call to investigate without exposing the
	// internal misconfiguration to the buyer.
	[FANBASIS_PUBLIC_SUBSCRIPTION_ERROR_CODES.PLAN_NOT_FOUND]:
		"Subscriptions are temporarily unavailable. We've been notified — please try again shortly.",
	[FANBASIS_PUBLIC_SUBSCRIPTION_ERROR_CODES.PROVIDER_NOT_SUPPORTED]:
		"Subscriptions are temporarily unavailable. We've been notified — please try again shortly.",
	[FANBASIS_PUBLIC_SUBSCRIPTION_ERROR_CODES.FETCH_FAILED]:
		"Something went wrong on our end. We've been notified.",
	'global:auth:unauthenticated': "We couldn't load checkout. Please try again.",
	'global:ratelimit:exceeded':
		'Too many requests — please wait a moment and try again.',
	'global:upload:file-too-large':
		"We couldn't load checkout. Please try again.",
	'global:upload:invalid-image': "We couldn't load checkout. Please try again.",
	'global:upload:invalid-content-type':
		"We couldn't load checkout. Please try again.",
	'global:upload:missing-boundary':
		"We couldn't load checkout. Please try again.",
	'global:upload:no-file': "We couldn't load checkout. Please try again.",
	network_error: 'Network trouble — check your connection and try again.',
	timeout_error: 'Network trouble — check your connection and try again.',
	connection_aborted: 'Network trouble — check your connection and try again.',
	unauthorized: "We couldn't load checkout. Please try again.",
	forbidden: "We couldn't load checkout. Please try again.",
	session_expired: "We couldn't load checkout. Please try again.",
	invalid_request: "We couldn't load checkout. Please try again.",
	validation_error: "We couldn't load checkout. Please try again.",
	internal_server_error:
		"Something went wrong on our end. We've been notified.",
	service_unavailable:
		"We couldn't reach our payment partner. Please try again in a moment.",
	unknown_error: "We couldn't load checkout. Please try again.",
} as const satisfies Record<FanbasisPublicSubscriptionErrorCode, string>;

function sessionErrorMessage(
	code: FanbasisPublicSubscriptionErrorCode,
): string {
	// `mapFanbasisPublicSubscriptionError` intentionally accepts `global:*`
	// backend codes. If the backend adds a new global URN before the FE type
	// union is updated, avoid rendering a blank alert and fall back to the
	// generic checkout copy.
	return (
		(SESSION_ERROR_MESSAGES as Partial<Record<string, string>>)[code] ??
		SESSION_ERROR_MESSAGES.unknown_error
	);
}

// =============================================================================
// COMPONENT
// =============================================================================

interface CreditPurchaseCardProps {
	readonly plan: SubscribePlan;
}

/**
 * Subscription enrollment card — email-gated CTA that mints a Fanbasis
 * hosted-redirect subscription checkout session for the plan supplied
 * by the route and full-page-navigates to the upstream payment page.
 *
 * Layout matches the Figma "Get your credits now!" mock — three stacked
 * frames inside a single bordered shell:
 *   1. Mint banner (80px) — persistent title.
 *   2. Form body — email input, two-branch account-flow disclosure,
 *      optional session error, "Claim My $N Credits" submit, Turnstile
 *      widget (managed mode, usually invisible).
 *   3. Offer-details band — disclosure copy on a 1px hairline footer.
 *
 * Session-mint runs through `useTransition` (not React Query) because
 * the result is consumed exactly once: the redirect side-effect fires
 * and the page unmounts. Caching has no consumer; the `pending` flag
 * is enough to drive the disabled / loading UI.
 *
 * Post-payment flow: Fanbasis captures the first charge → user redirects
 * to `successUrl` (server-set to `/credits-pending`) → backend webhook
 * either enrols the existing user directly or buffers a pending
 * subscription grant + sends a magic-link email. Magic-link verify drains
 * the pending row, creates the `user_subscriptions` row, and grants the
 * first cycle's credits. Subsequent monthly charges renew via Fanbasis
 * and replenish credits on the same cadence.
 *
 * @param plan - Plan config (slug forwarded to the backend; charge /
 *   payout drive the disclosure + CTA copy)
 * @returns Bordered card with header, form body, and offer footer
 */
export function CreditPurchaseCard({ plan }: CreditPurchaseCardProps) {
	// Turnstile gate (audit H1): unauthenticated payment endpoints are the
	// prime card-testing surface; the backend requires a verified token
	// (`fanbasis-checkout` action + `fanbasis-public-subscription-v1` cdata)
	// to mint the session. CTA stays disabled until the token resolves.
	const [captchaToken, setCaptchaToken] = useState<string | null>(null);
	// Callback ref instead of `useRef` so retry handlers below can read the
	// latest imperative handle without the ref-in-closure staleness trap.
	const [turnstile, setTurnstile] = useState<TurnstileWidgetHandle | null>(
		null,
	);
	const [errorCode, setErrorCode] =
		useState<FanbasisPublicSubscriptionErrorCode | null>(null);
	const [isPending, startTransition] = useTransition();

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<CreditPurchaseFormValues>({
		resolver: zodResolver(creditPurchaseFormSchema),
		// `onTouched` defers validation until the user leaves the field once,
		// so the email-format error doesn't flash on first keystroke. After
		// the first blur, every change re-validates so the error clears
		// inline once the address becomes valid.
		mode: 'onTouched',
	});

	function handleClaim(values: CreditPurchaseFormValues) {
		// Captcha is gated at the button-disabled level; this guard only
		// fires if the token expired between paint and submit. Run before
		// `startTransition` so a guarded path doesn't flash the pending UI.
		if (captchaToken === null) return;
		setErrorCode(null);
		startTransition(async () => {
			const result = await createFanbasisPublicSubscriptionCheckout({
				captchaToken,
				email: values.email,
				planSlug: plan.slug,
			});
			if (!result.success) {
				// Single-use captcha token — reset on failure so the user
				// gets a fresh challenge before retrying. Same token would
				// be rejected by the backend on the next attempt anyway.
				turnstile?.reset();
				setCaptchaToken(null);
				setErrorCode(result.error);
				return;
			}
			// Full-page navigation by design — `router.push` would keep the
			// stale RSC payload that ran while the user was unauthenticated.
			// The redirect lands the buyer on Fanbasis's hosted payment page;
			// post-payment they bounce back to `successUrl` (`/credits-pending`)
			// configured server-side.
			window.location.assign(result.data.checkoutUrl);
		});
	}

	const isCtaDisabled = captchaToken === null || isPending;

	return (
		<div className="border-ink-900 w-full max-w-sm self-center overflow-hidden rounded-3xl border bg-white xl:mx-0 xl:w-(--container-credit-card) xl:max-w-none xl:shrink-0 xl:self-start">
			{/* Mint banner — Figma 80px fixed height. Persistent across
			    every form state so the visual frame never shifts as the
			    button toggles between idle / pending / error. */}
			<div className="bg-brand-mint border-ink-900 flex h-(--spacing-subscribe-mint-header) items-center justify-center rounded-t-3xl border-b px-4">
				<p className="font-clash-display text-headline-md text-navy tracking-micro text-center font-semibold">
					Get your credits now!
				</p>
			</div>

			{/* Form body — email + account-flow disclosure, then submit, then
			    Turnstile (rendered last so the primary action stays the
			    visual focus). The email is forwarded to the backend so the
			    post-payment magic-link target is locked to the address typed
			    here, not whatever the buyer retypes on Fanbasis's hosted
			    page. */}
			<form
				className="flex flex-col gap-3 p-5"
				onSubmit={handleSubmit(handleClaim)}
				noValidate
			>
				<Field>
					<FieldLabel htmlFor="credit-purchase-email">
						Who is receiving your ${plan.chargeUsd} in credits?
					</FieldLabel>
					<Input
						id="credit-purchase-email"
						type="email"
						placeholder="your@email.com"
						autoComplete="email"
						aria-invalid={Boolean(errors.email)}
						disabled={isPending}
						{...register('email')}
					/>
					{/* Account-flow disclosure. Surfaced pre-payment so an existing
					    user routes to /sign-in BEFORE submit — the backend rejects
					    existing-email checkouts with a generic checkout-failed URN
					    (enumeration shield), so without this hint a returning user
					    would hit an opaque error toast with no recovery path. */}
					<FieldDescription>
						New to Rafli? We&apos;ll create your account after checkout and
						email a magic link. Already have an account?{' '}
						<Link href="/sign-in" className="underline">
							Sign in
						</Link>{' '}
						first.
					</FieldDescription>
					<FieldError errors={[errors.email]} />
				</Field>

				{errorCode === null ? null : (
					<p role="alert" className="text-body-sm text-ink-700 text-center">
						{sessionErrorMessage(errorCode)}
					</p>
				)}

				<Button
					type="submit"
					size="lg"
					disabled={isCtaDisabled}
					className="h-12 font-semibold"
				>
					{isPending ? (
						<Loader2 className="size-4 animate-spin" aria-hidden />
					) : null}
					{isPending ? 'Redirecting…' : `Claim My $${plan.payoutUsd} Credits`}
				</Button>

				{/* Turnstile renders BELOW the submit so the form's primary
				    action stays the visual focus; most visitors never see an
				    interactive challenge (managed mode auto-passes), and the
				    button stays disabled until a token resolves so the
				    submit flow remains a single click. */}
				<TurnstileWidget
					ref={setTurnstile}
					action="fanbasis-checkout"
					cData="fanbasis-public-subscription-v1"
					onToken={setCaptchaToken}
					onExpire={() => setCaptchaToken(null)}
					onError={() => setCaptchaToken(null)}
					className="flex justify-center"
				/>
			</form>

			{/* Offer disclosure footer — Figma places it below the form body
			    (top-[421px] on the 481px frame). Ranks below the CTA in
			    reading order so the price reveal happens after the buyer has
			    already committed to the credits offer.
			    Subscription terms (recurring monthly charge, cancel-anytime,
			    no refund clause) are spelled out in plain text — implicit
			    consent on a hosted-checkout flow needs the recurring-billing
			    disclosure surfaced before the upstream redirect, per FTC
			    negative-option guidance. */}
			<div className="border-ink-150 border-t px-5 py-3">
				<p className="text-3xs text-ink-300">
					Subscription details: ${plan.chargeUsd}/month, billed monthly until
					cancelled. ${plan.payoutUsd} in credit value applied each cycle.
					Cancel anytime from your account.
				</p>
			</div>
		</div>
	);
}
