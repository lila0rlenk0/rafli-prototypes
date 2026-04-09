import type { ClientErrorCode } from './client-errors';
import type { CommonErrorCode } from './common-errors';

export const NOTIFICATION_ERROR_CODES = {
	/** Notification not found */
	NOT_FOUND: 'core:notification:not-found',
	/** Validation failure (Zod schema mismatch) */
	VALIDATION_FAILED: 'core:notification:validation-failed',
} as const;

export type NotificationErrorCode =
	| (typeof NOTIFICATION_ERROR_CODES)[keyof typeof NOTIFICATION_ERROR_CODES]
	| ClientErrorCode
	| CommonErrorCode;
