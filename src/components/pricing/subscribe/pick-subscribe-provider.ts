import {
	type SubscriptionPlan,
	type SubscriptionProvider,
	SUBSCRIPTION_PROVIDER,
} from '@/types/subscription';

/**
 * Decide which provider rail a subscribe CTA should target for a given plan.
 *
 * Two inputs feed the decision:
 * - `availableProviders` — the per-plan list of providers the BE returns
 *   for this plan (derived from its `stripePriceId` / `fanbasisProductId`
 *   columns; guaranteed non-empty because the BE filters out plans where
 *   neither id is set).
 * - `lockedProvider` — the rail the viewer is bound to once they have any
 *   subscription history (from `GET /me/subscription`). Null only for
 *   first-time buyers; non-null even after a churn so the re-subscribe CTA
 *   stays on the rail the buyer's billing history already lives on.
 *
 * Decision matrix:
 * - Lock set + lock present in `availableProviders` → use the lock.
 * - Lock set + lock NOT in `availableProviders` → return null. The plan
 *   isn't offered on the viewer's locked rail and the BE would reject the
 *   subscribe with `payments:subscription:provider-locked`; callers
 *   render an unavailable CTA instead of letting the click fail.
 * - Lock null → pick from `availableProviders`. Stripe takes precedence
 *   when offered because it's the older rail with full self-serve coverage
 *   (portal, in-place plan change); Fanbasis only when Stripe is not on
 *   this plan. The BE-guaranteed non-empty array makes the Fanbasis
 *   fall-through safe.
 *
 * Replaces the older `lockedProvider ?? STRIPE` shortcut that pre-dated
 * per-plan provider availability — that default silently bypassed the
 * Fanbasis-only-plan case.
 *
 * @returns Provider for the subscribe CTA, or null when the plan is not
 *   available on the viewer's locked rail.
 */
export function pickSubscribeProvider(options: {
	availableProviders: SubscriptionPlan['availableProviders'];
	lockedProvider: SubscriptionProvider | null;
}): SubscriptionProvider | null {
	const { availableProviders, lockedProvider } = options;
	if (lockedProvider !== null) {
		return availableProviders.includes(lockedProvider) ? lockedProvider : null;
	}
	if (availableProviders.includes(SUBSCRIPTION_PROVIDER.STRIPE)) {
		return SUBSCRIPTION_PROVIDER.STRIPE;
	}
	return SUBSCRIPTION_PROVIDER.FANBASIS;
}
