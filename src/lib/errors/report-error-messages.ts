import {
	COMMON_ERROR_CODES,
	REPORT_ERROR_CODES,
	type ReportErrorCode,
} from '@/types/errors';

/**
 * Maps report error codes to user-friendly messages
 * Used in the report mutation's onError handler.
 */
export function getReportErrorMessage(errorCode: ReportErrorCode): string {
	switch (errorCode) {
		case REPORT_ERROR_CODES.DUPLICATE:
			return 'You have already reported this content.';
		case REPORT_ERROR_CODES.RAFFLE_ID_REQUIRED:
			return 'Could not identify the raffle for this report.';
		case REPORT_ERROR_CODES.RAFFLE_ID_MISMATCH:
			return 'Report context mismatch. Please refresh and try again.';
		case REPORT_ERROR_CODES.VALIDATION_FAILED:
			return 'Please check your report reason and try again.';
		case COMMON_ERROR_CODES.NETWORK_ERROR:
			return 'Network error. Please check your connection.';
		case COMMON_ERROR_CODES.TIMEOUT_ERROR:
			return 'Request timed out. Please try again.';
		case COMMON_ERROR_CODES.UNAUTHORIZED:
			return 'Please sign in to report content.';
		default:
			return 'Failed to submit report. Please try again.';
	}
}
