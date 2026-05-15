/**
 * Shared helpers for the post-payment surfaces (`/subscription-pending-*`
 * and `/subscription-success-*`). The three plan-specific routes per
 * surface (Basic / Starter / Pro) each pin a `SubscribePlan` at module
 * scope and delegate parsing / analytics decisions to the helpers here,
 * so the pages stay thin composition shells (architecture.md: "pages
 * fetch, domain components render"). Helpers live in `components/`
 * instead of in `app/` because once 6 routes share them they are no
 * longer route-coupled — see testing.md note on route-scoped utils.
 */

// RFC 5321 mailbox length cap — mirrors the backend DTO's `email` bound
// and acts as a sanity guard before render so a hand-crafted query
// string with a giant value can't blow out the card layout.
const MAX_EMAIL_LENGTH = 254;

// Deliberately minimal email shape check. We are NOT validating
// deliverability — the backend already did that at create-checkout time.
// We just confirm the value Fanbasis echoed back looks like
// `local@domain`, otherwise we degrade to generic copy instead of
// rendering a malformed string in the buyer-facing card.
const EMAIL_SHAPE_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Pull a single string out of a `searchParams` entry that could be a
 * plain string, an array (repeated keys), or undefined. Always picks the
 * first array entry — repeated `?email=a&email=b` is non-sensical here,
 * but Next.js's inferred type allows it so the parser must not throw.
 *
 * @param value - Raw `searchParams[key]` value
 * @returns First string value, or `null` when missing / empty array
 */
export function firstSearchParam(
	value: string | string[] | undefined,
): string | null {
	if (Array.isArray(value)) {
		return value[0] ?? null;
	}
	return value ?? null;
}

/**
 * Extract a displayable email from `searchParams.email`. Returns the
 * trimmed value only if it matches the basic shape AND fits the RFC
 * 5321 cap; otherwise `null` so the caller renders generic copy. The
 * backend already validated the address at checkout time — this is a
 * defensive trim/shape check so a tampered URL can't reach the DOM.
 *
 * @param value - Raw `searchParams.email` value
 * @returns Trimmed email, or `null` when the value is missing / malformed
 *   / oversize
 */
export function parsePendingSubscriptionEmail(
	value: string | string[] | undefined,
): string | null {
	const raw = firstSearchParam(value);
	if (raw === null) return null;
	const trimmed = raw.trim();
	if (trimmed.length === 0 || trimmed.length > MAX_EMAIL_LENGTH) return null;
	if (!EMAIL_SHAPE_REGEX.test(trimmed)) return null;
	return trimmed;
}

interface ShouldTrackPublicSubscriptionClaimParams {
	readonly userId: string | undefined;
}

/**
 * Gate for the `Public Credit Claimed` Mixpanel event on the
 * subscription-success surfaces. Fires only when the session cookie
 * resolved — without a known user id the event would attach to the
 * anonymous distinct_id and split the funnel into two disjoint cohorts.
 * The expired-link fallback branch is a distinct event class and
 * deliberately stays silent here.
 *
 * @param params.userId - User id resolved from the session, or `undefined`
 *   when no session exists (magic link expired / replayed)
 * @returns `true` iff the success metric should fire
 */
export function shouldTrackPublicSubscriptionClaim({
	userId,
}: ShouldTrackPublicSubscriptionClaimParams): boolean {
	return Boolean(userId);
}
