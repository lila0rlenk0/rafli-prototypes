/**
 * Compile-time feature flags for gating unreleased surfaces.
 *
 * Flip a flag here and redeploy — no env var dance needed. Once a
 * feature graduates to permanent, delete the flag and remove all
 * call-site guards.
 */

export const FEATURE_FLAGS = {
	/**
	 * Gates the `SubscribePromoCard` rail on `/browse`.
	 *
	 * Toggle independently of `/pricing` itself: the route stays mounted
	 * either way; this flag only controls whether the cross-sell rail
	 * appears alongside the browse hero.
	 */
	SUBSCRIBE_PROMO_ENABLED: true,
} as const;
