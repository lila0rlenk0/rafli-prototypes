/**
 * Compile-time feature flags for gating unreleased surfaces.
 *
 * Flip a flag here and redeploy — no env var dance needed. Once a
 * feature graduates to permanent, delete the flag and remove all
 * call-site guards.
 */

/**
 * Gates the `/pricing` route (Stripe-backed subscription plans).
 *
 * When off, the route 404s via `notFound()` in its layout. Flip together
 * with the `/subscriptions/*` backend endpoints. The `SubscribePromoCard`
 * on /browse links to /pricing, so its flag derives from this one to keep
 * the CTA from ever landing on a 404.
 */
const PRICING_PAGE_ENABLED = true;

export const FEATURE_FLAGS = {
	/**
	 * Gates the `/subscribe` route (Fanbasis credit-purchase landing).
	 *
	 * When off, the route 404s via `notFound()` in its layout — chosen
	 * over a redirect so external probes can't distinguish "feature off"
	 * from "route never existed". Leave off until the Fanbasis embedded
	 * checkout + magic-link webhook are both wired in production; a half-
	 * wired flow strands paying users on a checkout that can't complete.
	 *
	 * Independent of `PRICING_PAGE_ENABLED` and `SUBSCRIBE_PROMO_ENABLED`
	 * — `/pricing` and the browse promo card target the Stripe-backed
	 * subscription flow, not the Fanbasis credit flow, so they ship on
	 * separate timelines.
	 */
	SUBSCRIBE_PAGE_ENABLED: false,
	PRICING_PAGE_ENABLED,
	SUBSCRIBE_PROMO_ENABLED: PRICING_PAGE_ENABLED,
	/**
	 * Gates /messages inbox, the WebSocket stream, and the navbar chat icon.
	 * Live in production — the WS connection cost is now paid alongside the
	 * notifications stream. Kept as a flag so the surface can be killed in
	 * one redeploy if the chat backend regresses.
	 */
	CHAT_ENABLED: true,
	/**
	 * Gates the `/credits-claimed` "Credits claimed!" success branch.
	 *
	 * The Fanbasis webhook that provisions the user, grants credits, and
	 * sends the magic link is not wired yet. With this flag off, every
	 * post-payment landing on `/credits-claimed` shows an "awaiting magic
	 * link" intermediate state regardless of session — the alternative is
	 * misattributing every successful charge as an expired link, since
	 * `getSession()` will be null until the webhook ships. Flip to `true`
	 * the same commit that enables the webhook subscriber on the backend.
	 */
	FANBASIS_MAGIC_LINK_ENABLED: false,
} as const;

/**
 * Length of the rolling launch-pricing countdown window in milliseconds.
 *
 * The /pricing banner counts down from this value to zero, then loops:
 * once it hits 00:00:00 the deadline rolls forward by another window and
 * the timer keeps ticking. Boundaries are anchored to the unix epoch so
 * every client sees the same deadline at the same instant (no per-session
 * randomness, no SSR drift across tabs).
 *
 * Set to `null` to hide the banner entirely. The constant — and the gate
 * in `/pricing/page.tsx` — can be deleted in the same cleanup pass as the
 * `PRICING_PAGE_ENABLED` flag once launch pricing is over for good.
 */
export const LAUNCH_PRICING_WINDOW_MS: number | null = 2 * 24 * 60 * 60 * 1_000;
