import type { ClientErrorCode } from './client-errors';
import type { CommonErrorCode } from './common-errors';

export const WINNING_ERROR_CODES = {
	// Backend never emits `core:winning:no-winnings`, `invalid-raffle`, or
	// `not-owner` — ownership failures surface as `permission-denied` and
	// raffle-level failures use `core:raffle:*`. Dropping these three removes
	// dead switch branches.

	/** Winning not found */
	NOT_FOUND: 'core:winning:not-found',
	/** Invalid status transition */
	INVALID_STATUS: 'core:winning:invalid-status',
	/** Raffle not in fulfilling status */
	RAFFLE_NOT_FULFILLING: 'core:raffle:not-fulfilling',
	/** Winner has not claimed with shipping info */
	NOT_CLAIMED: 'core:winning:not-claimed',
	/** Permission denied (not raffle host) */
	PERMISSION_DENIED: 'core:winning:permission-denied',
	/** Invalid state shape for status transition */
	INVALID_STATE_SHAPE: 'core:winning:invalid-state-shape',
	/** Raffle not found */
	RAFFLE_NOT_FOUND: 'core:winning:raffle-not-found',

	/** Generic fetch failure (Zod validation, etc.) */
	FETCH_FAILED: 'fetch_failed',
	/** Failed to confirm received */
	CONFIRM_FAILED: 'confirm_failed',
	/** Failed to claim winning */
	CLAIM_FAILED: 'claim_failed',
	/** Failed to mark as sent */
	MARK_SENT_FAILED: 'mark_sent_failed',
	/** Failed to mark as delivered */
	MARK_DELIVERED_FAILED: 'mark_delivered_failed',
} as const;

export type WinningErrorCode =
	| (typeof WINNING_ERROR_CODES)[keyof typeof WINNING_ERROR_CODES]
	| ClientErrorCode
	| CommonErrorCode;
