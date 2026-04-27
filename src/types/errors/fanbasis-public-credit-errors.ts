import type { CommonErrorCode } from './common-errors';

/**
 * Fanbasis Public Credit Error Codes
 *
 * Error codes emitted by the unauthenticated Fanbasis public-credit checkout
 * endpoint (`POST /api/v1/payments/fanbasis/public-credit-checkout`). Kept in
 * a dedicated file rather than merged into `payment-errors.ts` because the
 * endpoint speaks its own URN namespace (`payments:fanbasis:*`) and has its
 * own rate-limit semantics that do not apply to the authenticated payment
 * surfaces — folding them together would force the regular PaymentErrorCode
 * consumers (Stripe, crypto) to branch on codes they can never produce, and
 * vice versa.
 *
 * Source of truth: the URNs thrown by `createFanbasisEmbeddedSession` in
 * `raffles-core-backend/src/payments/infrastructure/fanbasis.client.ts` and
 * the rate-limit middleware tagged on the public route in
 * `payments.public.api.ts` (`tags: ['ratelimit:strict']` → `global:*`). Any
 * new URN added there must be mirrored here and wired through
 * `mapFanbasisPublicCreditError` + the `CreditPurchaseCard` toast handler,
 * otherwise the FE silently collapses it into `unknown_error`.
 */

export const FANBASIS_PUBLIC_CREDIT_ERROR_CODES = {
	/**
	 * Transient upstream failure — Fanbasis 5xx, network, timeout, or
	 * contract drift. FE shows generic retry copy; the iframe stays mounted
	 * so the user can try again without re-entering card details.
	 */
	CHECKOUT_FAILED: 'payments:fanbasis:checkout-failed',
	/**
	 * Fanbasis 429 — too many session-mint attempts in a short window.
	 * Distinct from the gateway's `global:ratelimit:exceeded` (per-IP cap on
	 * our side); the FE asks the user to wait and retry.
	 */
	RATE_LIMITED: 'payments:fanbasis:rate-limited',
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
