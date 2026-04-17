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
