import { CircleCheck, MailQuestion } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { SubscribeNavbar } from '@/components/subscribe/navbar';
import { Button } from '@/components/ui/button';
import { PUBLIC_CREDIT_EVENTS } from '@/lib/analytics/events';
import { trackAfter } from '@/lib/analytics/mixpanel-server';
import { getSession } from '@/lib/auth/session';

/**
 * `/credits-claimed` — Better-Auth magic-link callback ONLY.
 *
 * End-to-end flow:
 * 1. Visitor completes Fanbasis checkout, gets bounced to `/credits-pending`
 *    with the "check your email" state (see that route's docstring).
 * 2. Fanbasis webhook fires `FulfillFanbasisPublicCreditCommand` on the
 *    backend, which either grants credits to an existing user or queues a
 *    pending grant + sends a Better-Auth magic link.
 * 3. User clicks the email link. Better-Auth verifies, auto-creates the
 *    user if needed, sets the session cookie, fires `accountCreatedTopic`
 *    (which drains the pending grant), and redirects here.
 *
 * Two-state render: session present → success card; no session → "Magic
 * link expired" fallback (the link genuinely was replayed or timed out —
 * the page is no longer hit by the Fanbasis success redirect, so this
 * branch can no longer mis-classify the post-payment-pre-email state).
 *
 * No `searchParams` handling: the Better-Auth callback sets the session
 * cookie out-of-band and does not append params we care about; adding
 * surface here without a populated caller violates `development.md`'s
 * "no speculative props" rule.
 *
 * `noindex` because a crawler hitting this URL without a real magic-link
 * session would always fall into the expired branch, poisoning
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
	readonly userId: string | undefined;
}

export function shouldTrackPublicCreditClaim({
	userId,
}: ShouldTrackPublicCreditClaimParams): boolean {
	return Boolean(userId);
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
	// Deliberately not firing on the expired branch: an unprovisioned
	// landing is a distinct event class and deserves its own signal if we ever
	// need it, rather than polluting the success metric.
	const userId = session?.user?.id;
	if (shouldTrackPublicCreditClaim({ userId })) {
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
 * Two-way render gate for the post-payment landing.
 *
 * @param hasSession - True iff a Better-Auth session cookie is live
 * @returns Success card (session present) or fallback card (no session).
 */
function ClaimedStateCard({ hasSession }: ClaimedStateCardProps) {
	if (hasSession) {
		return <ClaimedSuccessCard />;
	}
	return <ClaimedFallbackCard />;
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
				Your $10 in Rafli credits are live on your account. Pick a live raffle
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
 * Routes back to `/subscribe-basic` rather than `/sign-in` because:
 * - `/sign-in` expects a known account; at this point the user might not
 *   remember their email or never finished checkout.
 * - `/subscribe-basic` lets them retry from the top of the entry-level
 *   funnel and produces a new magic link if the previous one timed out
 *   (Starter / Pro tiers are reachable from there).
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
				<Link href="/subscribe-basic">Back to subscribe</Link>
			</Button>
		</div>
	);
}
