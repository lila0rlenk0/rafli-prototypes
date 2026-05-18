import { MailCheck } from 'lucide-react';

import type { SubscribePlan } from './plans';

interface SubscriptionPendingCardProps {
	readonly plan: SubscribePlan;
	readonly email: string | null;
}

/**
 * "Check your email" surface rendered on every `/subscription-pending-*`
 * landing — the screen buyers hit IMMEDIATELY after Fanbasis captures
 * the first subscription charge, BEFORE the webhook fulfillment runs
 * and BEFORE the Better-Auth magic-link email arrives.
 *
 * Card chrome was dropped in favour of a centred, full-bleed mint
 * canvas (the page shell paints `bg-brand-mint`) — the single decisive
 * CTA is "go check your inbox," and any extra container chrome competes
 * with that signal.
 *
 * The email is shown only when we have a confidently parsed value
 * (`parsePendingSubscriptionEmail`) so the buyer can confirm the inbox
 * and notice typos like `gmial.com` immediately. When parsing fails,
 * copy falls back to a generic instruction — never "Check your email
 * at undefined", which would erode trust on a page they just paid to
 * land on.
 *
 * Plan-aware copy uses `plan.chargeUsd` (what the buyer just paid) and
 * `plan.payoutUsd` (the credit face value awarded each cycle) so each
 * tier's confirmation surfaces the actual numbers the buyer locked in.
 *
 * @param plan - Plan config pinned at the route level
 * @param email - Trimmed email parsed from `searchParams.email`, or
 *   `null` when missing / malformed
 * @returns Mint full-bleed confirmation screen
 */
export function SubscriptionPendingCard({
	plan,
	email,
}: SubscriptionPendingCardProps) {
	return (
		<div className="flex w-full max-w-2xl flex-col items-center gap-6 text-center">
			<MailCheck
				className="text-ink-900 size-16"
				strokeWidth={2.25}
				aria-hidden
			/>

			<h1 className="font-clash-display text-headline-lg text-ink-900 font-semibold sm:text-4xl">
				One click left — check your email!
			</h1>

			<div className="text-body-md text-ink-900 flex flex-col gap-1 font-medium">
				<p>
					Sign-in link sent to{' '}
					{email === null ? (
						'the email you entered at checkout'
					) : (
						// `break-all` keeps long localparts from blowing the layout
						// out of its max-width on narrow viewports.
						<span className="font-semibold break-all">{email}</span>
					)}
					.
				</p>
				<p>
					You&apos;ve got ${plan.chargeUsd} in credits ready (a $
					{plan.payoutUsd} value). Give it a minute. Check spam if it&apos;s
					slow.
				</p>
			</div>
		</div>
	);
}
