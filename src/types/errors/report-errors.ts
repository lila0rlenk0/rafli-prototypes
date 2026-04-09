import type { ClientErrorCode } from './client-errors';
import type { CommonErrorCode } from './common-errors';

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

export type ReportErrorCode =
	| (typeof REPORT_ERROR_CODES)[keyof typeof REPORT_ERROR_CODES]
	| ClientErrorCode
	| CommonErrorCode;
