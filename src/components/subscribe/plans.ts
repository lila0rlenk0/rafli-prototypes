import { cdnUrl } from '@/lib/utils/cdn';

import type { Benefit, BenefitItem } from './benefit-card';

// =============================================================================
// PLAN SLUGS
// =============================================================================

/**
 * Snake-case slugs that map to `subscription_plans.slug` in the backend. The
 * Fanbasis public-subscription endpoint looks plans up by this string, so a
 * typo here surfaces as `payments:subscription:plan-not-found`.
 */
export const SUBSCRIBE_PLAN_SLUGS = {
	BASIC: 'basic_access_pass',
	STARTER: 'starter_access_pass',
	PRO: 'pro_access_pass',
} as const;

export type SubscribePlanSlug =
	(typeof SUBSCRIBE_PLAN_SLUGS)[keyof typeof SUBSCRIBE_PLAN_SLUGS];

// =============================================================================
// PLAN CONFIG
// =============================================================================

export interface SubscribePlan {
	/** Wire slug forwarded to the backend public-subscription checkout. */
	readonly slug: SubscribePlanSlug;
	/** Human-readable plan name — used in metadata titles and the navbar pill. */
	readonly name: string;
	/** Charge amount the buyer pays per cycle (USD, integer). */
	readonly chargeUsd: number;
	/** Credit value awarded each cycle after the charge (USD, integer). */
	readonly payoutUsd: number;
	/** Discount badge copy ("10% OFF", "15% OFF", "20% OFF"). */
	readonly badgeText: string;
	/**
	 * Discount percent applied to every entry (integer). Drives the hero
	 * tagline "Save N% on every deal." — kept as a number rather than a
	 * pre-formatted string so future copy variants can interpolate it into
	 * different sentence structures without re-parsing the badge text.
	 */
	readonly savingsPercent: number;
	/**
	 * Number of in-platform tickets the cycle's credit balance funds. Drives
	 * the prize-section copy ("Your N tickets work on any of these live
	 * raffles"); equals `chargeUsd` because every ticket costs $1.
	 */
	readonly ticketsPerCycle: number;
	/**
	 * Four benefit cards rendered in the benefits section. Order is fixed —
	 * the page reads it top-to-bottom on narrow viewports, so the strongest
	 * plan-specific value (savings + free entries) sits in cards 1-2 and the
	 * generic Rafli perk (phone plan) drops to card 3.
	 */
	readonly benefits: readonly [Benefit, Benefit, Benefit, Benefit];
}

// Card illustrations carry across every plan — only the bullet copy changes,
// so the CDN paths live once at module scope rather than four-times-per-plan.
const BENEFIT_IMAGES = {
	content: cdnUrl('static/images/subscribe/benefit-content-portal.webp'),
	earnings: cdnUrl('static/images/subscribe/benefit-boosted-earnings.webp'),
	phone: cdnUrl('static/images/subscribe/benefit-free-phone.webp'),
	sweepstakes: cdnUrl('static/images/subscribe/benefit-sweepstakes.webp'),
} as const;

// Phone-plan card surfaces a Mode-ecosystem member benefit (not subscription-
// tier-specific), so the copy is identical across every plan. The backend
// `subscription_plans.metadata.features` array does NOT carry this perk —
// it's a Rafli member-tier benefit rendered outside the per-plan catalogue.
// Lifted to module scope so the four arrays don't re-allocate a duplicate.
const SHARED_PHONE_PLAN_BENEFIT: Benefit = {
	image: BENEFIT_IMAGES.phone,
	title: 'Free phone plan',
	items: [
		{ text: 'Free Phone plan on a T Mobile-based MVNO', tag: null },
		{ text: 'Estimated $300+ in yearly savings', tag: null },
		{ text: 'Powered seamlessly by Helium under the hood', tag: null },
	],
};

// Content-library bullet text is identical across the three tiers — the
// backend ships it verbatim on every plan's `features` array. Hoisted so
// the three plans below share one source.
const CONTENT_LIBRARY_ITEM: BenefitItem = {
	text: 'Exclusive deals, partner offers, and FREE access to a 10k+ content library with online tips & tricks',
	tag: null,
};

/**
 * Per-plan config keyed by slug. Reads top-to-bottom in funnel order
 * (Basic → Starter → Pro) so a diff against a copy change scans naturally.
 *
 * Bullet text and tags are mirrored VERBATIM from the backend
 * `subscription_plans.metadata.features` JSON — keeping the strings byte-
 * identical means a future swap to a dynamic fetch from
 * `GET /subscriptions/plans` is a wiring change, not a copy change. The 4
 * image cards (Content Portal / Boosted Earnings / Phone plan / Sweepstakes
 * Access) are an FE-side composition layer that the backend doesn't model;
 * features are distributed by theme:
 *   - Content Portal — the shared content-library bullet
 *   - Boosted Earnings — the entry-discount bullet + (Starter/Pro) the
 *     "free entries to the weekly sweepstakes" bullet
 *   - Free phone plan — generic Rafli perk (not in backend features)
 *   - Sweepstakes Access — the expired-credits / subscriber-only-pool /
 *     priority-entry bullets
 *
 * Numeric values mirror `subscription_plans` rows in the backend; if a
 * plan price changes upstream the FE must update the corresponding row
 * here to keep the hero / disclosure / prize-section copy honest.
 */
export const SUBSCRIBE_PLANS = {
	[SUBSCRIBE_PLAN_SLUGS.BASIC]: {
		slug: SUBSCRIBE_PLAN_SLUGS.BASIC,
		name: 'Basic',
		chargeUsd: 10,
		payoutUsd: 11,
		badgeText: '10% OFF',
		savingsPercent: 10,
		ticketsPerCycle: 10,
		benefits: [
			{
				image: BENEFIT_IMAGES.content,
				title: 'Content Portal',
				items: [CONTENT_LIBRARY_ITEM],
			},
			{
				image: BENEFIT_IMAGES.earnings,
				title: 'Boosted Earnings',
				items: [{ text: '10% off every entry', tag: null }],
			},
			SHARED_PHONE_PLAN_BENEFIT,
			{
				image: BENEFIT_IMAGES.sweepstakes,
				title: 'Sweepstakes Access',
				items: [
					{
						text: 'Expired credits convert into entries for the monthly pool',
						tag: null,
					},
				],
			},
		],
	},
	[SUBSCRIBE_PLAN_SLUGS.STARTER]: {
		slug: SUBSCRIBE_PLAN_SLUGS.STARTER,
		name: 'Starter',
		chargeUsd: 25,
		payoutUsd: 30,
		badgeText: '15% OFF',
		savingsPercent: 15,
		ticketsPerCycle: 25,
		benefits: [
			{
				image: BENEFIT_IMAGES.content,
				title: 'Content Portal',
				items: [CONTENT_LIBRARY_ITEM],
			},
			{
				image: BENEFIT_IMAGES.earnings,
				title: 'Boosted Earnings',
				items: [
					{ text: '15% OFF on every sweepstakes entry!', tag: null },
					{ text: '5 free entries to the weekly sweepstakes', tag: 'NEW' },
				],
			},
			SHARED_PHONE_PLAN_BENEFIT,
			{
				image: BENEFIT_IMAGES.sweepstakes,
				title: 'Sweepstakes Access',
				items: [
					{
						text: 'Access to subscriber-only sweepstakes',
						tag: 'LIMITED OFFER',
					},
					{
						text: 'Expired credits convert into entries for the monthly sweepstakes',
						tag: null,
					},
				],
			},
		],
	},
	[SUBSCRIBE_PLAN_SLUGS.PRO]: {
		slug: SUBSCRIBE_PLAN_SLUGS.PRO,
		name: 'Pro',
		chargeUsd: 100,
		payoutUsd: 125,
		badgeText: '20% OFF',
		savingsPercent: 20,
		ticketsPerCycle: 100,
		benefits: [
			{
				image: BENEFIT_IMAGES.content,
				title: 'Content Portal',
				items: [CONTENT_LIBRARY_ITEM],
			},
			{
				image: BENEFIT_IMAGES.earnings,
				title: 'Boosted Earnings',
				items: [
					{ text: '20% OFF every sweepstakes entry!', tag: null },
					{ text: '25 free entries to the weekly sweepstakes', tag: 'NEW' },
				],
			},
			SHARED_PHONE_PLAN_BENEFIT,
			{
				image: BENEFIT_IMAGES.sweepstakes,
				title: 'Sweepstakes Access',
				items: [
					{
						text: 'Access to subscriber-only weekly AND monthly sweepstakes',
						tag: 'LIMITED OFFER',
					},
					{
						text: 'Expired credits convert into entries for the monthly sweepstakes',
						tag: null,
					},
					{
						text: 'Priority entry to limited-capacity sweepstakes',
						tag: 'Only PROs',
					},
				],
			},
		],
	},
} as const satisfies Record<SubscribePlanSlug, SubscribePlan>;
