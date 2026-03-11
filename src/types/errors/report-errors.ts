import type { ClientErrorCode } from './client-errors';
import type { CommonErrorCode } from './common-errors';

/**
 * Report Error Codes
 *
 * Report-specific error codes that match backend "moderation:report:*" error codes
 * for the content reporting endpoints.
 */

/**
 * Report error codes constant object
 * Contains moderation/report error codes used in the application
 */
export const REPORT_ERROR_CODES = {
	// Moderation report errors
	/** raffleId is required for comment/review/chat_message content types */
	RAFFLE_ID_REQUIRED: 'moderation:report:raffle-id-required',
	/** raffleId doesn't match the raffle associated with the content */
	RAFFLE_ID_MISMATCH: 'moderation:report:raffle-id-mismatch',
	/** User already reported this content */
	DUPLICATE: 'moderation:report:duplicate',

	// Generic validation failure (Zod validation, response parse error)
	VALIDATION_FAILED: 'moderation:report:validation-failed',
} as const;

/**
 * Report error code type
 * Represents all possible report-specific, client-side, and common error codes
 */
export type ReportErrorCode =
	| (typeof REPORT_ERROR_CODES)[keyof typeof REPORT_ERROR_CODES]
	| ClientErrorCode
	| CommonErrorCode;
