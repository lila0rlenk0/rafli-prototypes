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
import type { MySubmissionsResponse } from '@/types/kyc-submission';
import { mySubmissionsResponseSchema } from '@/types/kyc-submission';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Fetches all KYC/KYB verification submissions for the current user
 *
 * @returns ServiceResponse with list of submissions on success
 */
export async function getMySubmissions(): Promise<
	ServiceResponse<MySubmissionsResponse, KycSubmissionErrorCode>
> {
	try {
		const response = await authenticatedClient.get('/me/verification', {
			timeout: API_TIMEOUTS.QUERY,
		});

		const parsed = mySubmissionsResponseSchema.parse(response.data);
		return success(parsed);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'kyc-submission', 'get-my-submissions');
			return failure(KYC_SUBMISSION_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapKycSubmissionError(error);
		captureServiceError(error, errorCode, {
			service: 'kyc-submission',
			action: 'get-my-submissions',
		});
		return failure(errorCode);
	}
}
