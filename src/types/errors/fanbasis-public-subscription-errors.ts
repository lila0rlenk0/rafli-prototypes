import type { CommonErrorCode } from './common-errors';

/**
 * Fanbasis Public Subscription Error Codes
 *
 * Codes the anonymous-buyer subscription checkout
 * (`POST /api/v1/payments/fanbasis/public-subscription-checkout`) can surface.
 *
 * Kept in its own file rather than folded into
 * `fanbasis-public-credit-errors.ts` because this endpoint can also raise
 * two `payments:subscription:*` URNs (`plan-not-found`,
 * `provider-not-supported`). Folding them into the credit union would widen
 * the credit-flow toast map with codes the credit endpoint can never emit
 * and force every `CreditPurchaseCard` consumer to render no-op error copy
 * for unreachable branches. The full subscription error union
 * (`SubscriptionErrorCode`) is also wrong on this surface because the
 * unauthenticated funnel cannot legitimately produce
 * `already-subscribed` / `not-found` / `no-customer` / etc. — those are
 * logged-in-only states. A dedicated union is the narrow middle ground.
 *
 * Source of truth: the URNs thrown by
 * `CreateFanbasisPublicSubscriptionCheckoutCommand` and the rate-limit
 * middleware tagged on the public route in `payments.public.api.ts`
 * (`tags: ['ratelimit:strict']` → `global:*`). Any new URN added there
 * must be mirrored here and wired through `mapFanbasisPublicSubscriptionError`.
 */
export const FANBASIS_PUBLIC_SUBSCRIPTION_ERROR_CODES = {
	/**
	 * Transient upstream failure — Fanbasis 5xx, network, timeout, contract
	 * drift, or the deliberate existing-email enumeration shield collapsing
	 * onto the same URN. FE shows generic retry copy.
	 */
	CHECKOUT_FAILED: 'payments:fanbasis:checkout-failed',
	/**
	 * Fanbasis 429 — too many session-mint attempts in a short window.
	 * Distinct from the gateway's `global:ratelimit:exceeded` (per-IP cap on
	 * our side); the FE asks the user to wait and retry.
	 */
	RATE_LIMITED: 'payments:fanbasis:rate-limited',
	/**
	 * Plan slug did not resolve to an active `subscription_plans` row. Backend
	 * surfaces this deliberately (catalog is public — no enumeration risk) so
	 * a tampered or stale FE caller hitting an unknown slug surfaces a
	 * deterministic 404 rather than the opaque `checkout-failed` URN.
	 */
	PLAN_NOT_FOUND: 'payments:subscription:plan-not-found',
	/**
	 * Plan resolved but `subscription_plans.fanbasis_product_id` is NULL —
	 * Ops hasn't provisioned this tier on the Fanbasis side yet. Reusing the
	 * logged-in subscription URN for consistent client-side mapping.
	 */
	PROVIDER_NOT_SUPPORTED: 'payments:subscription:provider-not-supported',
	/** Generic fetch failure — used when Zod parse fails on response (schema mismatch). */
	FETCH_FAILED: 'fetch_failed',
} as const;

/**
 * Union of all error codes the Fanbasis public-subscription checkout service
 * can return. Includes the dedicated URNs plus the shared `CommonErrorCode`
 * fallback (network, timeout, HTTP-status fallbacks, gateway rate-limit) so
 * a network outage still narrows cleanly.
 */
export type FanbasisPublicSubscriptionErrorCode =
	| (typeof FANBASIS_PUBLIC_SUBSCRIPTION_ERROR_CODES)[keyof typeof FANBASIS_PUBLIC_SUBSCRIPTION_ERROR_CODES]
	| CommonErrorCode;
