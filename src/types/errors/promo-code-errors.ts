import type { ClientErrorCode } from './client-errors';
import type { CommonErrorCode } from './common-errors';

/** Uses `core:promo:*` prefix matching backend error codes */
export const PROMO_CODE_ERROR_CODES = {
	/** Promo code not found */
	NOT_FOUND: 'core:promo:not-found',
	/** User is not the host of this raffle */
	NOT_HOST: 'core:promo:not-host',
	/** Invalid value for promo code type */
	INVALID_VALUE: 'core:promo:invalid-value',
	/** Promo code has been deactivated */
	DEACTIVATED: 'core:promo:deactivated',
	/** Promo code has expired */
	EXPIRED: 'core:promo:expired',
	/** Promo code has reached max uses */
	MAX_USES_REACHED: 'core:promo:max-uses-reached',
	/** User has already redeemed this code */
	ALREADY_REDEEMED: 'core:promo:already-redeemed',
	/** Host cannot redeem their own promo codes */
	HOST_CANNOT_REDEEM: 'core:promo:host-cannot-redeem',
	/** Free tickets require answered question first */
	QUESTION_REQUIRED: 'core:promo:question-required',
	/** Promo code is for a different raffle */
	RAFFLE_MISMATCH: 'core:promo:raffle-mismatch',
	/** Raffle not found */
	RAFFLE_NOT_FOUND: 'core:raffle:not-found',
	/** Raffle is not live */
	RAFFLE_NOT_LIVE: 'core:raffle:not-live',
	/** Order not found */
	ORDER_NOT_FOUND: 'core:order:not-found',
	/** Order does not belong to current user */
	ORDER_PERMISSION_DENIED: 'core:order:permission-denied',
	/** Order is no longer pending */
	ORDER_NOT_PENDING: 'core:order:not-pending',
	/** Order already has a promo code applied */
	ORDER_ALREADY_DISCOUNTED: 'core:promo:order-already-discounted',
	/** Invalid request payload */
	INVALID_ARGUMENT: 'global:validation:invalid-argument',

	/** Generic fetch failure (Zod validation, etc.) */
	FETCH_FAILED: 'fetch_failed',
	/** Invalid promo code format (early validation) */
	INVALID_CODE: 'invalid_code',
} as const;

export type PromoCodeErrorCode =
	| (typeof PROMO_CODE_ERROR_CODES)[keyof typeof PROMO_CODE_ERROR_CODES]
	| ClientErrorCode
	| CommonErrorCode;
