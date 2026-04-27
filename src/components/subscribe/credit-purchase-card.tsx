'use client';

// Client component — mounts the Fanbasis embedded checkout iframe
// inline. Card-data PCI surface stays with Fanbasis: their iframe owns
// the email + card + terms inputs; our DOM never touches PAN data.
//
// The session secret is minted once on mount via the backend broker and
// passed straight into `<CheckoutProvider>`.
//
// Mode caveat: a successful charge here does NOT yet create a logged-in
// session — the Fanbasis webhook that grants credits + sends the
// magic-link email is gated by `FEATURE_FLAGS.FANBASIS_MAGIC_LINK_ENABLED`.
// `/credits-claimed` reads the same flag to render an "awaiting link"
// state until the backend subscriber lands.

import {
	AutoCheckout as FanbasisAutoCheckout,
	CheckoutProvider,
} from '@fanbasis/checkout-react';
import { Loader2 } from 'lucide-react';
import { type ComponentProps, useCallback, useMemo } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { captureServiceError } from '@/lib/sentry/capture';
import type { ServiceError } from '@/lib/query/errors';
import type { FanbasisPublicCreditCheckoutResponse } from '@/services/payment/create-fanbasis-public-credit-checkout';
import { useFanbasisPublicCreditSession } from '@/lib/hooks/use-fanbasis-public-credit-session';
import {
	FANBASIS_PUBLIC_CREDIT_ERROR_CODES,
	type FanbasisPublicCreditErrorCode,
} from '@/types/errors';

import { deriveFanbasisSdkErrorCode } from './fanbasis-error-code';
import { buildFanbasisCheckoutConfig } from './fanbasis-checkout-config';
import { CREDITS_CLAIMED_PATH, CREDIT_CHARGE_USD } from './offer';

// =============================================================================
// ERROR COPY
// =============================================================================

/**
 * Per-code copy for the session-mint failure card. Every
 * `FanbasisPublicCreditErrorCode` must map here so a new backend URN
 * surfaces a real toast instead of falling through to the generic
 * `unknown_error` arm — `error-handling.md` mandates the exhaustive
 * switch with `default: never`.
 *
 * Module-scoped so the lookup table is allocated once, not per render.
 */
const SESSION_ERROR_MESSAGES = {
	[FANBASIS_PUBLIC_CREDIT_ERROR_CODES.CHECKOUT_FAILED]:
		"We couldn't reach our payment partner. Please try again in a moment.",
	[FANBASIS_PUBLIC_CREDIT_ERROR_CODES.RATE_LIMITED]:
		'Too many checkout attempts. Please wait a minute and retry.',
	[FANBASIS_PUBLIC_CREDIT_ERROR_CODES.FETCH_FAILED]:
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
} as const satisfies Record<FanbasisPublicCreditErrorCode, string>;

function sessionErrorMessage(code: FanbasisPublicCreditErrorCode): string {
	// `mapFanbasisPublicCreditError` intentionally accepts `global:*` backend
	// codes. If the backend adds a new global URN before the frontend type
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

/**
 * Credit-purchase card with the Fanbasis embedded SDK.
 *
 * Layout matches the Figma "Get your credits now!" mock — three
 * stacked frames inside a single bordered shell:
 *   1. Mint banner (80px) — persistent title.
 *   2. Offer-details band — disclosure copy on a 1px hairline.
 *   3. Iframe slot — `<CheckoutProvider>` + `<AutoCheckout>` once the
 *      session secret is in hand. Loader / error states render in the
 *      same slot so the card frame never reflows.
 *
 * Session-mint runs through `useFanbasisPublicCreditSession` (a
 * `useQuery` wrapper). React Query handles the fetch lifecycle without
 * a `useEffect`, so the consumer never trips the
 * `react-hooks/set-state-in-effect` rule.
 *
 * Post-payment flow: Fanbasis captures the charge → `onSuccess` fires →
 * user lands on `/credits-claimed`. Until the backend webhook subscriber
 * ships (gated by `FEATURE_FLAGS.FANBASIS_MAGIC_LINK_ENABLED`), the
 * landing page renders an "awaiting magic link" intermediate state.
 *
 * @returns Bordered card with header, offer band, and iframe slot
 */
export function CreditPurchaseCard() {
	const sessionQuery = useFanbasisPublicCreditSession();

	function handleRetry() {
		void sessionQuery.refetch();
	}

	return (
		<div className="border-ink-900 w-full max-w-sm self-center overflow-hidden rounded-3xl border bg-white xl:mx-0 xl:w-(--container-credit-card) xl:max-w-none xl:shrink-0 xl:self-start">
			{/* Mint banner — Figma 80px fixed height. Persistent across
			    every session state so the visual frame never shifts as
			    the iframe boots or a retry cycle redraws the slot. */}
			<div className="bg-brand-mint border-ink-900 flex h-(--spacing-subscribe-mint-header) items-center justify-center rounded-t-3xl border-b px-4">
				<p className="font-clash-display text-headline-md text-navy tracking-micro text-center font-semibold">
					Get your credits now!
				</p>
			</div>

			{/* Offer disclosure — sits BETWEEN the header and the iframe per
			    Figma. The user reads the "what am I paying for" line before
			    the payment fields render, which softens the cognitive jump
			    from marketing copy into a card-entry surface. */}
			<div className="border-ink-150 border-b px-5 py-3">
				<p className="text-3xs text-ink-300">
					Offer details: One-time charge of ${CREDIT_CHARGE_USD}. Credits
					applied after email verification. Auto-refund if draw minimum not
					reached.
				</p>
			</div>

			{/* Iframe slot — single column reserves vertical space for the
			    SDK's internal layout (email + card + submit ≈ 380–420px in
			    the default Fanbasis composition). The min-height on each
			    inner state keeps the card from collapsing while the loader
			    or retry CTA renders. */}
			<div className="p-5">
				{sessionQuery.isPending ? <CheckoutLoading /> : null}
				{sessionQuery.isError ? (
					<CheckoutFailed error={sessionQuery.error} onRetry={handleRetry} />
				) : null}
				{sessionQuery.data ? (
					<EmbeddedCheckout session={sessionQuery.data} />
				) : null}
			</div>
		</div>
	);
}

// =============================================================================
// EMBEDDED CHECKOUT
// =============================================================================

type AutoCheckoutProps = Omit<
	ComponentProps<typeof FanbasisAutoCheckout>,
	'autoInit'
> & {
	readonly autoOpen?: boolean;
};

/**
 * Docs-shaped adapter for the currently published Fanbasis React package.
 *
 * Fanbasis docs and README describe `<AutoCheckout autoOpen />`, while
 * `@fanbasis/checkout-react@0.2.7` exposes the same behavior as `autoInit`.
 * Keeping the public call-site on `autoOpen` lets the integration mirror the
 * vendor contract and localizes the package mismatch to this bridge.
 *
 * @param props - Fanbasis AutoCheckout props, using documented `autoOpen`
 * @returns Vendor `<AutoCheckout>` with `autoOpen` mapped to `autoInit`
 */
function AutoCheckout({ autoOpen = true, ...props }: AutoCheckoutProps) {
	return <FanbasisAutoCheckout autoInit={autoOpen} {...props} />;
}

interface EmbeddedCheckoutProps {
	readonly session: FanbasisPublicCreditCheckoutResponse;
}

/**
 * Mounts the Fanbasis embedded SDK inline.
 *
 * `CheckoutProvider` owns the `PaymentCheckout` instance + iframe; we
 * pass the session payload as the typed `CheckoutConfig`. `AutoCheckout`
 * handles DOM attachment + lifecycle; we feed it `onSuccess` and
 * `onError` callbacks so we drive page-level navigation.
 *
 * On success: full-page navigate (not router.push) so the post-payment
 * route runs with a fresh RSC fetch — once the magic-link webhook ships,
 * the `getCurrentUser` cache will see the freshly-provisioned session
 * cookie and the route can render the authenticated state.
 *
 * On error: route through `captureServiceError` (canonical Sentry path
 * per `error-handling.md` for payment surfaces) so the issue inherits
 * the deterministic fingerprint and the `EXPECTED_ERROR_CODES` filter,
 * then surface a typed toast. The iframe stays mounted so a transient
 * network blip mid-charge can be retried without re-entering card data.
 *
 * `useCallback` here (and only here) because `<AutoCheckout>` reads the
 * callbacks inside its own effect lifecycle — a fresh reference each
 * render would re-arm those effects and risk re-mounting the iframe.
 */
function EmbeddedCheckout({ session }: EmbeddedCheckoutProps) {
	// `useMemo` so the config object reference stays stable across
	// re-renders. `<CheckoutProvider>` reacts to config changes via
	// `updateConfig` internally — passing a fresh reference per render
	// would re-init the iframe and lose any partially-typed card data.
	// The pure builder keeps the required SDK contract unit-testable
	// without mounting the third-party iframe.
	const config = useMemo(() => buildFanbasisCheckoutConfig(session), [session]);

	const handleSuccess = useCallback(() => {
		// Full-page navigation by design — `router.push` would keep the
		// stale RSC payload that ran while the user was unauthenticated.
		window.location.assign(CREDITS_CLAIMED_PATH);
	}, []);

	const handleError = useCallback((error: unknown) => {
		captureServiceError(error, deriveFanbasisSdkErrorCode(error), {
			service: 'payment',
			action: 'fanbasis-embedded-checkout',
		});
		toast.error("We couldn't complete checkout. Please try again.");
	}, []);

	return (
		<CheckoutProvider config={config}>
			<AutoCheckout
				autoOpen
				showLoadingState
				onSuccess={handleSuccess}
				onError={handleError}
			/>
		</CheckoutProvider>
	);
}

// =============================================================================
// LOADING + FAILED STATES
// =============================================================================

function CheckoutLoading() {
	return (
		<div
			role="status"
			aria-live="polite"
			className="flex min-h-72 flex-col items-center justify-center gap-3"
		>
			<Loader2 className="text-ink-500 size-6 animate-spin" aria-hidden />
			<p className="text-body-sm text-ink-500">Loading secure checkout…</p>
		</div>
	);
}

interface CheckoutFailedProps {
	readonly error: ServiceError<FanbasisPublicCreditErrorCode>;
	readonly onRetry: () => void;
}

/**
 * Failure card shown when the session-mint call fails.
 *
 * Copy is derived from the typed `ServiceError.code` so RATE_LIMITED
 * and RATE_LIMITED users get distinct guidance instead of one generic
 * "try again" — `error-handling.md` mandates an exhaustive switch with
 * `default: never`. The `as const satisfies` on
 * `SESSION_ERROR_MESSAGES` is the type-level exhaustiveness check; at
 * runtime the lookup is a single map index.
 */
function CheckoutFailed({ error, onRetry }: CheckoutFailedProps) {
	const message = sessionErrorMessage(error.code);
	return (
		<div
			role="alert"
			className="flex min-h-72 flex-col items-center justify-center gap-3 text-center"
		>
			<p className="text-body-sm text-ink-700">{message}</p>
			<Button type="button" size="lg" onClick={onRetry}>
				Retry
			</Button>
		</div>
	);
}
