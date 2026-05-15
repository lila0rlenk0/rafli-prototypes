import { CircleCheck, MailQuestion } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

import type { SubscribePlan } from './plans';

interface SubscriptionSuccessCardProps {
	readonly plan: SubscribePlan;
	readonly hasSession: boolean;
}

/**
 * Two-way render gate for the `/subscription-success-*` magic-link
 * callback. The session-present branch is the happy path (cookie set
 * by Better-Auth, credits granted by the webhook fulfillment); the
 * no-session branch covers a replayed or expired link.
 *
 * Plan-aware so the success card surfaces the actual credit value
 * the buyer just unlocked, and the fallback CTA routes back to the
 * matching subscribe-* landing so retries restart in the tier the
 * buyer originally picked — not the entry-level funnel.
 *
 * @param plan - Plan config pinned at the route level
 * @param hasSession - `true` iff a Better-Auth session cookie is live
 * @returns Success card (session present) or expired-link card
 */
export function SubscriptionSuccessCard({
	plan,
	hasSession,
}: SubscriptionSuccessCardProps) {
	if (hasSession) {
		return <SuccessClaimedCard plan={plan} />;
	}
	return <SuccessFallbackCard plan={plan} />;
}

interface SuccessClaimedCardProps {
	readonly plan: SubscribePlan;
}

/**
 * Happy-path card — the magic link worked, session cookie is live.
 *
 * Drops the user into browse because that's the first value moment
 * after the credits land: "your credits are on your account, here's
 * where to spend them." Going to `/my-raffles` or `/profile/credits`
 * first would add a navigation step before the user sees the
 * product's actual surface.
 */
function SuccessClaimedCard({ plan }: SuccessClaimedCardProps) {
	return (
		<div className="border-ink-900 bg-brand-mint flex w-full max-w-xl flex-col items-center gap-5 rounded-3xl border px-8 py-12 text-center sm:px-12">
			<span className="bg-ink-900 text-on-dark flex size-14 items-center justify-center rounded-2xl">
				<CircleCheck className="size-6" aria-hidden />
			</span>

			<h1 className="font-clash-display text-headline-lg text-ink-900 font-semibold">
				Credits claimed!
			</h1>

			<p className="text-body-md text-ink-alpha max-w-md font-medium">
				Your ${plan.payoutUsd} in Rafli credits are live on your account. Pick a
				live raffle and spend them on entries — your credits apply at checkout
				automatically.
			</p>

			<Button asChild size="lg" className="h-12 rounded-full font-semibold">
				<Link href="/browse">Browse raffles</Link>
			</Button>
		</div>
	);
}

interface SuccessFallbackCardProps {
	readonly plan: SubscribePlan;
}

/**
 * Fallback card — magic link expired or the backend sign-in failed.
 *
 * Routes back to the subscribe-* landing for the SAME tier the buyer
 * originally enrolled in, not `/sign-in`:
 * - `/sign-in` expects a known account; at this point the user might
 *   not remember their email or never finished checkout.
 * - The tier-specific subscribe page lets them retry from the top of
 *   the funnel they picked and produces a new magic link if the
 *   previous one timed out.
 *
 * Copy deliberately avoids blaming the user ("link expired" not "you
 * waited too long") — 30 minutes is short and an expired link is a
 * product constraint, not a user mistake.
 */
function SuccessFallbackCard({ plan }: SuccessFallbackCardProps) {
	// `plan.name` is the canonical tier label (`Basic` / `Starter` / `Pro`)
	// and the subscribe-* routes use its lowercased form verbatim — keeping
	// the mapping here avoids adding a redundant field to the plan config.
	const subscribeHref = `/subscribe-${plan.name.toLowerCase()}`;
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
				<Link href={subscribeHref}>Back to subscribe</Link>
			</Button>
		</div>
	);
}
