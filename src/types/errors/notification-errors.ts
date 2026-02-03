import type { ClientErrorCode } from './client-errors';
import type { CommonErrorCode } from './common-errors';

/**
 * Notification Error Codes
 *
 * Notification-specific error codes that match backend "core:notification:*" error codes.
 */

/**
 * Notification error codes constant object
 */
export const NOTIFICATION_ERROR_CODES = {
	/** Notification not found */
	NOT_FOUND: 'core:notification:not-found',
	/** Generic fetch failure (Zod validation, etc.) */
	FETCH_FAILED: 'fetch_failed',
} as const;

/**
 * Notification error code type
 * Represents all possible notification-specific, client-side, and common error codes
 */
export type NotificationErrorCode =
	| (typeof NOTIFICATION_ERROR_CODES)[keyof typeof NOTIFICATION_ERROR_CODES]
	| ClientErrorCode
	| CommonErrorCode;
