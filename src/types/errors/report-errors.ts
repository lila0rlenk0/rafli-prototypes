import type { ClientErrorCode } from './client-errors';
import type { CommonErrorCode } from './common-errors';

/**
 * Report error codes — maps to backend "moderation:report:*" error codes
 * for content reporting/moderation operations.
 */
export const REPORT_ERROR_CODES = {
	/** raffleId is required for comment/review/chat_message content types */
	RAFFLE_ID_REQUIRED: 'moderation:report:raffle-id-required',
	/** Provided raffleId doesn't match the content's actual raffle */
	RAFFLE_ID_MISMATCH: 'moderation:report:raffle-id-mismatch',
	/** User already reported this content */
	DUPLICATE: 'moderation:report:duplicate',
	/** Payload failed Zod validation (client-side) */
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
