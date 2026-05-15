import { MailCheck } from 'lucide-react';

import type { SubscribePlan } from './plans';

interface SubscriptionPendingCardProps {
	readonly plan: SubscribePlan;
	readonly email: string | null;
}

/**
 * "Check your email" card rendered on every `/subscription-pending-*`
 * landing — the surface buyers hit IMMEDIATELY after Fanbasis captures
 * the first subscription charge, BEFORE the webhook fulfillment runs
 * and BEFORE the Better-Auth magic-link email arrives.
 *
 * The email is shown only when we have a confidently parsed value
 * (`parsePendingSubscriptionEmail`) so the buyer can confirm the inbox
 * and notice typos like `gmial.com` immediately. When parsing fails,
 * copy falls back to a generic instruction — never "Check your email
 * at undefined", which would erode trust on a page they just paid to
 * land on.
 *
 * Plan-aware copy uses `plan.payoutUsd` so each tier's confirmation
 * surfaces the actual credit value the buyer is about to receive
 * ($11 Basic / $30 Starter / $125 Pro).
 *
 * @param plan - Plan config pinned at the route level — drives the
 *   credit-value mention so the funnel reinforces the tier's offer
 * @param email - Trimmed email parsed from `searchParams.email`, or
 *   `null` when missing / malformed
 * @returns Mint confirmation card
 */
export function SubscriptionPendingCard({
	plan,
	email,
}: SubscriptionPendingCardProps) {
	return (
		<div className="border-ink-900 bg-brand-mint flex w-full max-w-xl flex-col items-center gap-5 rounded-3xl border px-8 py-12 text-center sm:px-12">
			<span className="bg-ink-900 text-on-dark flex size-14 items-center justify-center rounded-2xl">
				<MailCheck className="size-6" aria-hidden />
			</span>

			<h1 className="font-clash-display text-headline-lg text-ink-900 font-semibold">
				Check your email
			</h1>

			<p className="text-body-md text-ink-900 font-medium">Payment received.</p>

			<p className="text-body-md text-ink-alpha max-w-md font-medium">
				We just sent a one-click sign-in link to{' '}
				{email === null ? (
					'the email you entered at checkout'
				) : (
					// `break-all` keeps long localparts from blowing the card
					// out of its max-width on narrow viewports.
					<span className="text-ink-900 font-semibold break-all">{email}</span>
				)}
				. Click it to claim your ${plan.payoutUsd} in Rafli credits.
			</p>

			<p className="text-body-sm text-ink-alpha max-w-md">
				The link can take a minute to arrive. If you don&apos;t see it, check
				your spam folder.
			</p>
		</div>
	);
}
