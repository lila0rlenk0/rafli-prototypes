import type { CommonErrorCode } from './common-errors';

/**
 * Fanbasis Public Credit Error Codes
 *
 * Error codes emitted under the `payments:fanbasis:*` URN namespace. The
 * file name retains "public-credit" for history, but the namespace now
 * covers both the unauthenticated public-credit checkout endpoint
 * (`POST /api/v1/payments/fanbasis/public-credit-checkout`) and the
 * authenticated subscription-cancel path that delegates to Fanbasis when
 * the user's lock points there. Kept in a dedicated file rather than
 * merged into `payment-errors.ts` because the namespace speaks its own
 * URNs and has its own rate-limit semantics that do not apply to the
 * authenticated Stripe/crypto payment surfaces — folding them together
 * would force the regular PaymentErrorCode consumers to branch on codes
 * they can never produce, and vice versa.
 *
 * Source of truth: the URNs thrown by `createFanbasisPublicCreditCheckout`
 * and the Fanbasis cancel path in
 * `raffles-core-backend/src/payments/infrastructure/fanbasis.client.ts`,
 * plus the rate-limit middleware tagged on the public route in
 * `payments.public.api.ts` (`tags: ['ratelimit:strict']` → `global:*`). Any
 * new URN added there must be mirrored here and wired through
 * `mapFanbasisPublicCreditError` + the `CreditPurchaseCard` toast handler,
 * otherwise the FE silently collapses it into `unknown_error`.
 */

export const FANBASIS_PUBLIC_CREDIT_ERROR_CODES = {
	/**
	 * Transient upstream failure — Fanbasis 5xx, network, timeout, or
	 * contract drift. FE shows generic retry copy; user stays on /subscribe
	 * (no redirect fires) so they can retry without re-entering details.
	 */
	CHECKOUT_FAILED: 'payments:fanbasis:checkout-failed',
	/**
	 * Fanbasis 429 — too many session-mint attempts in a short window.
	 * Distinct from the gateway's `global:ratelimit:exceeded` (per-IP cap on
	 * our side); the FE asks the user to wait and retry.
	 */
	RATE_LIMITED: 'payments:fanbasis:rate-limited',
	/**
	 * Upstream Fanbasis DELETE failed during a subscription cancel. Distinct
	 * from `not-active` (state mismatch) — this is a provider-side fault
	 * (5xx, network, auth) and the user should retry rather than re-read
	 * their subscription state. Surfaces through `cancelSubscription()` —
	 * `DELETE /subscriptions/:id` is provider-agnostic.
	 */
	CANCEL_FAILED: 'payments:fanbasis:cancel-failed',
	/** Generic fetch failure — used when Zod parse fails on response (schema mismatch). */
	FETCH_FAILED: 'fetch_failed',
} as const;

/**
 * Union of all error codes the Fanbasis public-credit checkout service can return.
 * Includes the dedicated Fanbasis URNs plus the shared `CommonErrorCode` fallback
 * (network, timeout, HTTP-status fallbacks, gateway rate-limit) so a network outage
 * still narrows cleanly.
 */
export type FanbasisPublicCreditErrorCode =
	| (typeof FANBASIS_PUBLIC_CREDIT_ERROR_CODES)[keyof typeof FANBASIS_PUBLIC_CREDIT_ERROR_CODES]
	| CommonErrorCode;
