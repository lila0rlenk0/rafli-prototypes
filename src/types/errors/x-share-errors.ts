import type { RaffleErrorCode } from './raffle-errors';

/**
 * X-share error codes returned by the raffle share-intent / verify endpoints.
 *
 * These endpoints are physically under the raffle service, so they still share
 * `RaffleErrorCode` fallbacks. The `core:xshare:*` namespace is narrower than
 * the general raffle union and needs its own type so UI code can pass errors
 * straight into the X-share copy mappers without unsafe casts.
 */
export const X_SHARE_ERROR_CODES = {
	/** User already claimed the one lifetime bonus entry for this raffle. */
	ALREADY_CLAIMED: 'core:xshare:already-claimed',
	/** Raffle has an entry question and the user has not answered it yet. */
	QUESTION_REQUIRED: 'core:xshare:question-required',
	/** Host/backend disabled X-share tickets for this raffle. */
	DISABLED: 'core:xshare:disabled',
	/** Pending share claim passed its backend expiry window. */
	EXPIRED: 'core:xshare:expired',
	/** No pending share claim exists for this user/raffle pair. */
	NOT_FOUND: 'core:xshare:not-found',
	/**
	 * Server-enforced retry throttle inside the lax-review window — backend
	 * caps X-API spend by rejecting verify retries that arrive before
	 * `pending_review.retryAfterSeconds` elapses. Anchored as a constant so
	 * the verify mapper, the Sentry filter, and the UI toast all reference
	 * the same symbol instead of duplicating the string literal.
	 */
	COOLDOWN: 'core:xshare:cooldown',
} as const;

export type XShareErrorCode =
	| (typeof X_SHARE_ERROR_CODES)[keyof typeof X_SHARE_ERROR_CODES]
	| RaffleErrorCode;

export type XShareIntentErrorCode = XShareErrorCode;

export type XShareVerifyErrorCode = XShareErrorCode;
