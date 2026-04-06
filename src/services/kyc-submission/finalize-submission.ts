'use server';

import { authenticatedClient } from '@/lib/api/client';
import { captureServiceError } from '@/lib/sentry/capture';
import { API_TIMEOUTS } from '@/lib/api/config';
import { failure, mapKycSubmissionError, success } from '@/lib/errors';
import type { KycSubmissionErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Finalizes a KYC/KYB verification submission after all documents are uploaded
 *
 * @param submissionId - The submission to finalize
 * @returns ServiceResponse with undefined on success
 */
export async function finalizeSubmission(
	submissionId: string,
): Promise<ServiceResponse<undefined, KycSubmissionErrorCode>> {
	try {
		await authenticatedClient.post(
			`/verification/${submissionId}/finalize`,
			undefined,
			{ timeout: API_TIMEOUTS.MUTATION },
		);

		return success(undefined);
	} catch (error) {
		const errorCode = mapKycSubmissionError(error);
		captureServiceError(error, errorCode, {
			service: 'kyc-submission',
			action: 'finalize-submission',
		});
		return failure(errorCode);
	}
}
