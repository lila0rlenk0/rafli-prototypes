import type { ReportErrorCode } from '@/types/errors';

/**
 * Maps report error codes to user-friendly messages
 * Used in the report content modal
 */
export function getReportErrorMessage(errorCode: ReportErrorCode): string {
	switch (errorCode) {
		case 'moderation:report:duplicate':
			return "You've already reported this content.";
		case 'moderation:report:raffle-id-required':
		case 'moderation:report:raffle-id-mismatch':
			return 'Unable to submit report. Please try again.';
		case 'moderation:report:validation-failed':
		case 'validation_error':
			return 'Please check your report and try again.';
		default:
			return 'Something went wrong. Please try again.';
	}
}
