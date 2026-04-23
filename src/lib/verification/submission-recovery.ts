import type { KycSubmissionErrorCode } from '@/types/errors';
import type {
	KycSubmissionResponse,
	MySubmissionsResponse,
	VerificationType,
} from '@/types/kyc-submission';
import type { ServiceResponse } from '@/types/service-response';

interface ResolveSubmissionIdParams {
	getMySubmissionsFn: () => Promise<
		ServiceResponse<MySubmissionsResponse, KycSubmissionErrorCode>
	>;
	submitResult: ServiceResponse<KycSubmissionResponse, KycSubmissionErrorCode>;
	verificationType: VerificationType;
}

type ResolveSubmissionIdResult =
	| {
			resumedFromExistingDraft: boolean;
			submissionId: string;
			success: true;
	  }
	| {
			errorCode: string;
			success: false;
	  };

/**
 * Resolves the submission ID to use for document upload/finalization.
 * Falls back to an existing pending submission when create fails with already-pending.
 *
 * @returns A submission id on success, or an error code if recovery is not possible
 */
export async function resolveSubmissionId(
	params: ResolveSubmissionIdParams,
): Promise<ResolveSubmissionIdResult> {
	const { getMySubmissionsFn, submitResult, verificationType } = params;

	if (submitResult.success) {
		return {
			success: true,
			submissionId: submitResult.data.id,
			resumedFromExistingDraft: false,
		};
	}

	if (submitResult.error !== 'core:verification:already-pending') {
		return { success: false, errorCode: submitResult.error };
	}

	const submissionsResult = await getMySubmissionsFn();
	if (!submissionsResult.success) {
		return { success: false, errorCode: submitResult.error };
	}

	const existingPending = submissionsResult.data.submissions.find(
		submission =>
			submission.type === verificationType && submission.status === 'pending',
	);
	if (!existingPending) {
		return { success: false, errorCode: submitResult.error };
	}

	return {
		success: true,
		submissionId: existingPending.id,
		resumedFromExistingDraft: true,
	};
}

/** Lookup — submission flow error code → user-facing toast copy. */
const SUBMISSION_ERROR_MESSAGES: Record<string, string> = {
	'core:verification:already-pending':
		'You already have a pending verification of this type. Please wait for it to be reviewed.',
	'core:verification:email-mismatch':
		'The email address must match the email you signed up with.',
	'core:verification:already-finalized':
		'This submission has already been finalized.',
	'core:verification:incomplete-documents':
		'Some required documents are missing. Please upload all required files.',
	'core:verification:not-pending':
		'This submission is no longer in a draft state and cannot be updated.',
	'core:verification:permission-denied':
		'You do not have permission to update this submission.',
	'core:verification:invalid-purpose':
		'One of the uploaded documents has an invalid purpose. Please refresh and try again.',
	'core:verification:document-exists':
		'A document for this slot was already uploaded. Please try uploading again.',
	'global:upload:file-too-large':
		'A document is larger than 10MB. Please upload a smaller file.',
	'global:upload:invalid-file-type':
		'Invalid file type. Only PDF, JPEG, PNG, and WebP are allowed.',
	'global:upload:invalid-content-type':
		'Invalid file type. Only PDF, JPEG, PNG, and WebP are allowed.',
	document_upload_failed:
		'Failed to upload document. Please check the file and try again.',
	'global:auth:unauthenticated': 'Please sign in to continue.',
	unauthorized: 'Please sign in to continue.',
	network_error: 'Network error. Please check your connection and try again.',
	timeout_error: 'Request timed out. Please try again.',
};

/**
 * Maps submission flow error codes to user-facing messages.
 *
 * @returns A readable error message for toast notifications
 */
export function getSubmissionErrorMessage(code: string): string {
	return (
		SUBMISSION_ERROR_MESSAGES[code] ?? 'Something went wrong. Please try again.'
	);
}
