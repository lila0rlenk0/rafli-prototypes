'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import {
	captureContractDrift,
	captureServiceError,
} from '@/lib/sentry/capture';
import { API_TIMEOUTS } from '@/lib/api/config';
import { failure, mapKycSubmissionError, success } from '@/lib/errors';
import {
	KYC_SUBMISSION_ERROR_CODES,
	type KycSubmissionErrorCode,
} from '@/types/errors';
import type { KycSubmissionDetail } from '@/types/kyc-submission';
import { kycSubmissionDetailSchema } from '@/types/kyc-submission';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Fetches full detail of a user's own KYC submission.
 * Includes form data and documents with signed download URLs.
 *
 * @param id - Submission UUID
 * @returns ServiceResponse with submission detail
 */
export async function getSubmissionDetail(
	id: string,
): Promise<ServiceResponse<KycSubmissionDetail, KycSubmissionErrorCode>> {
	try {
		const response = await authenticatedClient.get(`/verification/${id}`, {
			timeout: API_TIMEOUTS.QUERY,
		});

		const parsed = kycSubmissionDetailSchema.parse(response.data);
		return success(parsed);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'kyc-submission', 'get-submission-detail');
			return failure(KYC_SUBMISSION_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapKycSubmissionError(error);
		captureServiceError(error, errorCode, {
			service: 'kyc-submission',
			action: 'get-submission-detail',
		});
		return failure(errorCode);
	}
}
