import type { CommonErrorCode } from './common-errors';

/**
 * Subscription Error Codes
 *
 * Codes returned by the backend `payments:subscription:*` namespace (see
 * `raffles-core-backend/src/payments/commands/*-subscription.command.ts`).
 * Grouped below by the endpoint that can raise them, because the pricing
 * page surfaces different copy per entry point (plans list vs. subscribe vs.
 * my-subscription) and the grouping makes it obvious which mapper branch
 * each code exercises.
 */
export const SUBSCRIPTION_ERROR_CODES = {
	// Create subscription — raised by POST /subscriptions/subscribe.
	/** Requested plan is inactive or missing — Ops deactivated it after the UI fetched /plans */
	PLAN_NOT_FOUND: 'payments:subscription:plan-not-found',
	/** User already has an active/cancelled/past_due subscription — blocks new checkout */
	ALREADY_SUBSCRIBED: 'payments:subscription:already-subscribed',
	/** Stripe did not return a checkout URL — backend-side Stripe API failure */
	CHECKOUT_FAILED: 'payments:subscription:checkout-failed',

	// Manage subscription — raised by cancel + GET /me/subscription flows.
	/** Subscription row not found for this user — e.g. already expired */
	NOT_FOUND: 'payments:subscription:not-found',
	/** Attempted to cancel a non-active subscription */
	NOT_ACTIVE: 'payments:subscription:not-active',
	/** Webhook enrollment race — user ended up double-subscribed, backend rolled back */
	ENROLLMENT_CONFLICT: 'payments:subscription:enrollment-conflict',

	// Frontend-only — Zod parse failure on an otherwise-successful response.
	/** Response shape drifted from the backend contract — captured as contract drift */
	FETCH_FAILED: 'fetch_failed',
} as const;

/**
 * Union of every error code a subscription server action can surface.
 * Includes the common transport/auth fallbacks so callers can narrow
 * exhaustively in a `switch` without double-typing.
 */
export type SubscriptionErrorCode =
	| (typeof SUBSCRIPTION_ERROR_CODES)[keyof typeof SUBSCRIPTION_ERROR_CODES]
	| CommonErrorCode;
