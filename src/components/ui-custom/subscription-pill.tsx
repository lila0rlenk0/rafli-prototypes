'use client';

import { Sparkles, Star, Wallet } from 'lucide-react';
import Link from 'next/link';

import { cn } from '@/lib/class-names';
import { useCreditBalance } from '@/services/payment/use-credit-balance';
import { useMySubscription } from '@/services/subscription/use-my-subscription';

import { getSubscriptionPillState } from './subscription-pill.helpers';

/**
 * Unified navbar pill that fuses subscription tier + credit balance into one
 * rounded element split by a vertical divider — mirrors the Figma navbar
 * spec (nodes 2091:1620 non-subscribed, 2092:3157 starter/pro). Replaces the
 * previous two-pill arrangement (`SubscriptionTierBadge` + `CreditBalanceBadge`)
 * because the design treats them as one identity affordance, not two adjacent
 * status chips.
 *
 * Three visual states tied to the user's subscription:
 *   - **Non-subscribed** → grey hairline border + grey text, left half reads
 *     "Subscribe" (no icon, by design — it's a CTA, not a status), right half
 *     shows the wallet icon and current balance ($0 for guests). The whole
 *     pill links to `/pricing` so a clicker lands on the upsell flow.
 *   - **Starter (non-highlighted plan)** → ink-alpha border on a light
 *     background, left half shows the sparkle glyph + plan name, right half
 *     shows the wallet + balance. Whole pill links to `/profile` so the
 *     subscriber can see/manage their plan and credits in one place.
 *   - **Pro (`metadata.isHighlighted`)** → solid `bg-brand-yellow` with the
 *     same ink-alpha border + ink-alpha text. Brightest chip in the navbar;
 *     flags the user as on the featured tier without changing the layout.
 *
 * Why one `<Link>` rather than two: Figma renders a single rounded silhouette
 * with an internal divider. Splitting into two anchors would (a) introduce
 * two focus stops where the design implies one, (b) break the rounded outer
 * border at the join, and (c) force a divider element with its own border to
 * fake the seam. A single link with a 1px self-stretching spacer is simpler
 * and matches the visual.
 *
 * Why the render-state lives in `getSubscriptionPillState`:
 * `useMySubscription`'s `data` is `MySubscription | null | undefined` (React
 * Query layers `undefined` over the hook's declared `T | null`). The earlier
 * inline `subscription !== null` check let `undefined` slip through and
 * crashed `subscription.plan` on transient query errors. Extracting the
 * resolution lets a unit test pin down the collapse of `null` and `undefined`
 * into the single non-subscribed branch — see `subscription-pill.test.ts`.
 *
 * Loading: returns `null` while `useMySubscription` is in flight to avoid the
 * "flash of guest pill, then flash of subscriber pill" sequence on a hard
 * navigation. Credit balance falls back to $0 inside the helper if its query
 * is still loading — non-subscribers should see the pill immediately once
 * the subscription query resolves.
 *
 * @returns Merged tier+credit navbar pill, or `null` while subscription
 *          state is unknown.
 */
export function SubscriptionPill() {
	const { data: subscriptionResponse, isLoading: isLoadingSubscription } =
		useMySubscription();
	const { data: credit } = useCreditBalance();

	// Hide until we know the user's subscription state. Avoids a flash of the
	// non-subscribed CTA pill on subscribers' first paint, which would briefly
	// suggest they need to "Subscribe" again.
	if (isLoadingSubscription) return null;

	// Wrapper exposes `{ subscription, capabilities, lockedProvider }`; the pill
	// only cares about the embedded entity for tier-vs-CTA display, so we
	// drill into `subscription` here. Capabilities/lockedProvider live on the
	// management surfaces (plan card, profile pill button), not the navbar pill.
	const state = getSubscriptionPillState(
		subscriptionResponse?.subscription,
		credit?.availableAmount,
	);

	// Subscribers go to /profile to manage; guests go to /pricing to convert.
	// The single-link decision (see component JSDoc) means the CTA semantic
	// has to live on the whole pill, so we pick the destination that matches
	// the more probable next step for each viewer cohort.
	const href = state.kind === 'subscribed' ? '/profile' : '/pricing';
	const title =
		state.kind === 'subscribed'
			? `Active subscription — ${state.planName}`
			: 'Subscribe to unlock perks';
	const isHighlighted = state.kind === 'subscribed' && state.isHighlighted;

	return (
		<Link
			href={href}
			title={title}
			className={cn(
				// Geometry per Figma: h-9 (36px) total, px-6 (24px) outer padding,
				// gap-2.5 (10px) between the two content halves and the central
				// divider. Border + radius hold the rounded silhouette together;
				// no `overflow-hidden` needed because gap-2.5 keeps the divider
				// well clear of the rounded corners.
				'flex h-9 items-center gap-2.5 rounded-full border px-6 text-sm font-semibold',
				state.kind === 'subscribed'
					? // Subscribed — transparent body, ink-alpha border + ink. Same
						// chrome for Starter and Pro; the tier glyph alone (Sparkles
						// vs Star) carries the differentiation per the latest Figma,
						// which dropped the yellow Pro fill in favour of a cleaner
						// monochrome navbar.
						'border-ink-alpha text-ink-alpha'
					: // Non-subscribed — grey hairline + grey text. Recedes vs
						// the "Help us improve" CTA so the user is nudged toward
						// the stronger action while still being clickable.
						'border-ink-500 text-ink-500',
			)}
		>
			<span className="flex items-center gap-1">
				{state.kind === 'subscribed' ? (
					<>
						{/* Tier glyph — Star marks the highlighted (Pro) tier so it
						    visually echoes the same Star used in the credits-card My
						    Sub cell. Starter keeps the Sparkles glyph so the two
						    tiers stay distinguishable at navbar size. */}
						{isHighlighted ? (
							<Star className="size-4" aria-hidden />
						) : (
							<Sparkles className="size-4" aria-hidden />
						)}
						<span>{state.planName}</span>
					</>
				) : (
					<span>Subscribe</span>
				)}
			</span>
			{/* Internal divider — single 1px line that picks up the same colour
			    as the surrounding text so the seam doesn't fight the border.
			    `aria-hidden` keeps assistive tech from treating it as a stop. */}
			<span
				aria-hidden
				className={cn(
					'w-px self-stretch',
					// Yellow + light variants share the ink-alpha seam; non-
					// subscribed echoes the grey border so the divider doesn't
					// suddenly read as the only black element on a grey pill.
					state.kind === 'subscribed' ? 'bg-ink-alpha' : 'bg-ink-500',
				)}
			/>
			<span className="flex items-center gap-1">
				<Wallet className="size-4" aria-hidden />
				<span>{state.balanceLabel}</span>
			</span>
		</Link>
	);
}
