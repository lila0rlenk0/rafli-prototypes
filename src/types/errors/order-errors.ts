import type { ClientErrorCode } from './client-errors';
import type { CommonErrorCode } from './common-errors';
import type { PromoCodeErrorCode } from './promo-code-errors';

export const ORDER_ERROR_CODES = {
	// Order errors
	/** Raffle is not live */
	NOT_ACTIVE: 'core:raffle:not-active',
	/** Raffle is sold out */
	SOLD_OUT: 'core:raffle:sold-out',
	/** User reached max tickets per user (counts pending + completed) */
	USER_TICKET_LIMIT_EXCEEDED: 'core:raffle:user-ticket-limit-exceeded',
	/** Order not found */
	NOT_FOUND: 'core:order:not-found',
	/** User doesn't have permission to access this order */
	PERMISSION_DENIED: 'core:order:permission-denied',
	/** Invalid ticket quantity (e.g., <= 0) */
	INVALID_QUANTITY: 'core:order:invalid-quantity',
	/** Order already completed */
	ALREADY_COMPLETED: 'core:order:already-completed',
	/** Required raffle question not answered before purchase */
	QUESTION_NOT_ANSWERED: 'core:order:question-not-answered',
	/** Raffle not found (deleted or invalid ID) */
	RAFFLE_NOT_FOUND: 'core:raffle:not-found',

	// Generic fetch failure (Zod validation, etc.)
	FETCH_FAILED: 'fetch_failed',
} as const;

export type OrderErrorCode =
	| (typeof ORDER_ERROR_CODES)[keyof typeof ORDER_ERROR_CODES]
	| ClientErrorCode
	| CommonErrorCode;

/**
 * Error union returned by the atomic `/orders/checkout` endpoint.
 *
 * Wider than plain `OrderErrorCode` because the endpoint validates and redeems
 * a promo code inside the order transaction — backend can surface the full
 * `core:promo:*` namespace alongside order/raffle errors.
 */
export type CheckoutOrderErrorCode = OrderErrorCode | PromoCodeErrorCode;
