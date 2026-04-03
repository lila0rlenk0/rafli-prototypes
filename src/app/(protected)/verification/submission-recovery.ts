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

/**
 * Maps submission flow error codes to user-facing messages.
 *
 * @returns A readable error message for toast notifications
 */
export function getSubmissionErrorMessage(code: string): string {
	switch (code) {
		case 'core:verification:already-pending':
			return 'You already have a pending verification of this type. Please wait for it to be reviewed.';
		case 'core:verification:email-mismatch':
			return 'The email address must match the email you signed up with.';
		case 'core:verification:already-finalized':
			return 'This submission has already been finalized.';
		case 'core:verification:incomplete-documents':
			return 'Some required documents are missing. Please upload all required files.';
		case 'core:verification:not-pending':
			return 'This submission is no longer in a draft state and cannot be updated.';
		case 'core:verification:permission-denied':
			return 'You do not have permission to update this submission.';
		case 'core:verification:invalid-purpose':
			return 'One of the uploaded documents has an invalid purpose. Please refresh and try again.';
		case 'core:verification:document-exists':
			return 'A document for this slot was already uploaded. Please try uploading again.';
		case 'global:upload:file-too-large':
			return 'A document is larger than 10MB. Please upload a smaller file.';
		case 'global:upload:invalid-file-type':
		case 'global:upload:invalid-content-type':
			return 'Invalid file type. Only PDF, JPEG, PNG, and WebP are allowed.';
		case 'document_upload_failed':
			return 'Failed to upload document. Please check the file and try again.';
		case 'global:auth:unauthenticated':
		case 'unauthorized':
			return 'Please sign in to continue.';
		case 'network_error':
			return 'Network error. Please check your connection and try again.';
		case 'timeout_error':
			return 'Request timed out. Please try again.';
		default:
			return 'Something went wrong. Please try again.';
	}
}
