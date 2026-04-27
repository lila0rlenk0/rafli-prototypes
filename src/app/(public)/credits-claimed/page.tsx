import { CircleCheck, MailCheck, MailQuestion } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { SubscribeNavbar } from '@/components/subscribe/navbar';
import { Button } from '@/components/ui/button';
import { PUBLIC_CREDIT_EVENTS } from '@/lib/analytics/events';
import { trackAfter } from '@/lib/analytics/mixpanel-server';
import { getSession } from '@/lib/auth/session';
import { FEATURE_FLAGS } from '@/lib/feature-flags';

/**
 * `/credits-claimed` — landing page that the Better-Auth magic link opens.
 *
 * End-to-end flow once `FANBASIS_MAGIC_LINK_ENABLED` is on:
 * 1. Visitor completes Fanbasis checkout.
 * 2. Fanbasis webhook fires `provision-fanbasis-public-credit` on the
 *    backend, which creates the user, grants credits, and sends the
 *    Better-Auth magic link.
 * 3. User clicks the email link. Better-Auth verifies it, sets the session
 *    cookie, and redirects here.
 *
 * Until the webhook subscriber ships, the page is reached only by the
 * `window.location.assign(CREDITS_CLAIMED_PATH)` jump fired from the
 * `<AutoCheckout>` `onSuccess` callback — there is no session cookie at
 * that point, so the legacy "session ? success : expired" branching would
 * misattribute every successful charge as an expired link. The flag
 * collapses the page to a single "awaiting magic link" intermediate state
 * during the rollout window; flip the flag the same commit that turns the
 * webhook on.
 *
 * No `searchParams` handling: nothing on the FE currently emits a query
 * string into this URL, and the magic-link callback shape is not yet
 * frozen on the backend. `development.md` forbids speculative props —
 * add the param surface back the same commit it actually gets populated.
 *
 * `noindex` because a crawler hitting this URL without a real magic-link
 * session would always fall into the awaiting/expired branch, poisoning
 * search-results with an apparent error state.
 */

const TITLE = 'Credits claimed';
const DESCRIPTION =
	'Your Rafli credits are ready — jump into an active raffle and enter in seconds.';

export const metadata: Metadata = {
	title: TITLE,
	description: DESCRIPTION,
	robots: {
		index: false,
		follow: false,
		nocache: true,
	},
};

interface ShouldTrackPublicCreditClaimParams {
	readonly isMagicLinkEnabled: boolean;
	readonly userId: string | undefined;
}

export function shouldTrackPublicCreditClaim({
	isMagicLinkEnabled,
	userId,
}: ShouldTrackPublicCreditClaimParams): boolean {
	return isMagicLinkEnabled && Boolean(userId);
}

export default async function CreditsClaimedPage() {
	// `getSession()` is `cache()`-deduped per request — so even if a
	// downstream layout re-reads it (unlikely on this leaf page), only one
	// round-trip to the backend happens.
	const session = await getSession();

	// Mixpanel: fire exactly once per successful landing, and ONLY when the
	// session cookie resolved. This is the event that stitches the anonymous
	// `CHECKOUT_STARTED` properties (emitted before sign-in) to the now-known
	// user id — without it the funnel would show two disjoint funnels.
	// Deliberately not firing on the awaiting/expired branch: an unprovisioned
	// landing is a distinct event class and deserves its own signal if we ever
	// need it, rather than polluting the success metric.
	const userId = session?.user?.id;
	if (
		shouldTrackPublicCreditClaim({
			isMagicLinkEnabled: FEATURE_FLAGS.FANBASIS_MAGIC_LINK_ENABLED,
			userId,
		})
	) {
		void trackAfter(PUBLIC_CREDIT_EVENTS.CLAIMED, {}, { userId });
	}

	return (
		// `(public)/` has no parent layout, so this page owns its own
		// `<main>` shell. `min-h-dvh` beats `min-h-screen` on mobile
		// Safari; `overflow-x-clip` contains any future full-bleed
		// bleeds without spawning a scroll container.
		<main className="bg-background relative min-h-dvh overflow-x-clip">
			<SubscribeNavbar>
				<section className="flex min-h-(--spacing-page-dvh) flex-col items-center justify-center py-16">
					<ClaimedStateCard hasSession={Boolean(session)} />
				</section>
			</SubscribeNavbar>
		</main>
	);
}

interface ClaimedStateCardProps {
	readonly hasSession: boolean;
}

/**
 * Three-way render gate for the post-payment landing.
 *
 * Order matters: the magic-link feature flag is checked FIRST, before the
 * session cookie. While the webhook subscriber is offline,
 * `getSession()` is null on every visit (the cookie is only set by the
 * magic-link callback). Branching on the cookie before the flag would
 * surface a "Magic link expired" UX for every successful charge — the
 * exact misattribution the flag exists to prevent.
 *
 * @param hasSession - True iff a Better-Auth session cookie is live
 * @returns Awaiting card (flag off), success card (flag on + session),
 *   or fallback card (flag on + no session)
 */
function ClaimedStateCard({ hasSession }: ClaimedStateCardProps) {
	if (!FEATURE_FLAGS.FANBASIS_MAGIC_LINK_ENABLED) {
		return <ClaimedAwaitingCard />;
	}
	if (hasSession) {
		return <ClaimedSuccessCard />;
	}
	return <ClaimedFallbackCard />;
}

/**
 * Awaiting-link card — payment captured, magic-link webhook still off.
 *
 * Tone is positive ("we got your payment, watch your inbox") because at
 * this point the visitor has paid and the only outstanding step is on our
 * side, not theirs. Avoids the "expired link" copy that would imply user
 * fault when the actual cause is a backend feature still rolling out.
 */
function ClaimedAwaitingCard() {
	return (
		<div className="border-ink-900 bg-brand-mint flex w-full max-w-xl flex-col items-center gap-5 rounded-3xl border px-8 py-12 text-center sm:px-12">
			<span className="bg-ink-900 text-on-dark flex size-14 items-center justify-center rounded-2xl">
				<MailCheck className="size-6" aria-hidden />
			</span>

			<h1 className="font-clash-display text-headline-lg text-ink-900 font-semibold">
				Payment received
			</h1>

			<p className="text-body-md text-ink-alpha max-w-md font-medium">
				Your $11 in Rafli credits are on the way. We&apos;ll email you a secure
				sign-in link as soon as your account is ready — usually within a minute.
			</p>

			<Button asChild size="lg" className="h-12 rounded-full font-semibold">
				<Link href="/browse">Browse raffles</Link>
			</Button>
		</div>
	);
}

/**
 * Happy-path card — the magic link worked, session cookie is live.
 *
 * Drops the user into browse because that's the first value moment after
 * the credits land: "your credits are on your account, here's where to
 * spend them." Going to `/my-raffles` or `/profile/credits` first would
 * add a navigation step before the user sees the product's actual surface.
 */
function ClaimedSuccessCard() {
	return (
		<div className="border-ink-900 bg-brand-mint flex w-full max-w-xl flex-col items-center gap-5 rounded-3xl border px-8 py-12 text-center sm:px-12">
			<span className="bg-ink-900 text-on-dark flex size-14 items-center justify-center rounded-2xl">
				<CircleCheck className="size-6" aria-hidden />
			</span>

			<h1 className="font-clash-display text-headline-lg text-ink-900 font-semibold">
				Credits claimed!
			</h1>

			<p className="text-body-md text-ink-alpha max-w-md font-medium">
				Your $11 in Rafli credits are live on your account. Pick a live raffle
				and spend them on entries — your credits apply at checkout
				automatically.
			</p>

			<Button asChild size="lg" className="h-12 rounded-full font-semibold">
				<Link href="/browse">Browse raffles</Link>
			</Button>
		</div>
	);
}

/**
 * Fallback card — magic link expired or the backend sign-in failed.
 *
 * Routes back to `/subscribe` rather than `/sign-in` because:
 * - `/sign-in` expects a known account; at this point the user might not
 *   remember their email or never finished checkout.
 * - `/subscribe` lets them retry from the top of the funnel and produces a
 *   new magic link if the previous one timed out.
 *
 * Copy deliberately avoids blaming the user ("link expired" not "you
 * waited too long") — 30 minutes is short and an expired link is a
 * product constraint, not a user mistake.
 */
function ClaimedFallbackCard() {
	return (
		<div className="border-ink-900 bg-background flex w-full max-w-xl flex-col items-center gap-5 rounded-3xl border px-8 py-12 text-center sm:px-12">
			<span className="bg-ink-900 text-on-dark flex size-14 items-center justify-center rounded-2xl">
				<MailQuestion className="size-6" aria-hidden />
			</span>

			<h1 className="font-clash-display text-headline-lg text-ink-900 font-semibold">
				Magic link expired
			</h1>

			<p className="text-body-md text-ink-alpha max-w-md font-medium">
				This sign-in link has already been used or has timed out. Kick off the
				flow again and we&apos;ll send you a fresh link.
			</p>

			<Button asChild size="lg" className="h-12 rounded-full font-semibold">
				<Link href="/subscribe">Back to subscribe</Link>
			</Button>
		</div>
	);
}
