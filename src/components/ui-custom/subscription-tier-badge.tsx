'use client';

import { Crown } from 'lucide-react';
import Link from 'next/link';

import { cn } from '@/lib/class-names';
import { useMySubscription } from '@/services/subscription/use-my-subscription';

/**
 * Navbar pill that surfaces the authenticated user's current subscription
 * tier — sibling to `CreditBalanceBadge`. Same geometry (38px height, full
 * rounding, 14px text) so the two pills read as a matched pair in the nav.
 *
 * Visual language tracks the plan's own `metadata.isHighlighted` flag
 * rather than a separate "tier" slug:
 *   - Highlighted plan (today: Pro) → solid yellow, mirrors the CTA
 *     treatment on the Pro plan card and the launch-countdown banner.
 *   - Non-highlighted plan (today: Starter) → white with a hairline black
 *     border, recedes next to the credit pill without disappearing.
 *
 * Rendered as `null` for guests, loading states, and users without a
 * subscription. The pricing page already owns the "upgrade prompt" — this
 * badge is purely a status indicator, never a call-to-action.
 *
 * @returns A tier pill, or `null` when there's nothing meaningful to show.
 */
export function SubscriptionTierBadge() {
	const { data, isLoading } = useMySubscription();

	// Business rule: hide while loading and when there's no subscription.
	// The empty slot avoids a layout shift when the badge appears, but also
	// avoids the "flash of logged-in-with-no-sub" moment that a placeholder
	// skeleton would create for the majority of users (who aren't subscribers).
	if (isLoading || !data) return null;

	const { plan } = data;
	const isHighlighted = plan.metadata.isHighlighted;

	return (
		<Link
			href="/profile"
			title={`Active subscription — ${plan.name}`}
			className={cn(
				// Geometry matches CreditBalanceBadge — same height and paddings
				// so the two pills align pixel-perfect in the nav row.
				'flex h-[38px] items-center gap-1.5 rounded-full border px-4 text-sm font-semibold',
				isHighlighted
					? // Featured tier — solid yellow, black border+text. Brightest
						// chip in the nav; designed to be the one thing a subscriber
						// spots first when they glance at the row.
						'bg-brand-yellow border-black text-black'
					: // Non-featured tier — white with hairline border so it sits
						// quietly next to the yellow credit pill without competing.
						'border-black bg-white text-black',
			)}
		>
			<Crown className="size-3.5" aria-hidden />
			<span>{plan.name}</span>
		</Link>
	);
}
