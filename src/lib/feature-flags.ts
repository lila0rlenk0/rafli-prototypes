/**
 * Compile-time feature flags for gating unreleased surfaces.
 *
 * Flip a flag here and redeploy — no env var dance needed. Once a
 * feature graduates to permanent, delete the flag and remove all
 * call-site guards.
 */
export const FEATURE_FLAGS = {
	/** Gates /pricing page and subscription promo UI (browse page, navbar badge). */
	SUBSCRIPTION_ENABLED: false,
	/**
	 * Gates /messages inbox, the WebSocket stream, and the navbar chat icon.
	 * Keeping it off avoids paying for the WS connection until the chat
	 * domain ships — flip to `true` once the backend is wired in production.
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
 * Launch-pricing countdown deadline (ISO 8601 datetime).
 *
 * Set to an ISO string to show the countdown banner on /pricing.
 * Set to `null` when launch pricing is over — the banner disappears
 * and the constant can be deleted in the same cleanup pass as the
 * `SUBSCRIPTION_ENABLED` flag.
 */
export const LAUNCH_PRICING_ENDS_AT: string | null = null;
