/**
 * Shared mock-preview constants — safe to import from both server modules
 * (`@/lib/api/mock/state`) and the client toggle panel. Lives in `types/`
 * because it's a client-safe `as const` map with an inferred union, and so it
 * sidesteps the `server-only` requirement on `lib/api/*`.
 *
 * Only meaningful when `MOCK_DATA=true`.
 */

/** Cookie holding the active mock state. Non-httpOnly so the panel can set it. */
export const MOCK_STATE_COOKIE = 'rafli-mock-state';

export const MOCK_STATES = [
	'guest',
	'none',
	'active',
	'past_due',
	'cancelled',
	'expired',
] as const;

export type MockState = (typeof MOCK_STATES)[number];

/** Human-readable labels for the toggle panel, in display order. */
export const MOCK_STATE_LABELS: Readonly<Record<MockState, string>> = {
	guest: 'Guest (logged out)',
	none: 'Logged in · no subscription',
	active: 'Subscription · active',
	past_due: 'Subscription · past due',
	cancelled: 'Subscription · cancelled',
	expired: 'Subscription · expired',
};
