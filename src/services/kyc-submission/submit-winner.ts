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
	COMMON_ERROR_CODES,
	KYC_SUBMISSION_ERROR_CODES,
	type KycSubmissionErrorCode,
} from '@/types/errors';
import type { KycSubmissionResponse } from '@/types/kyc-submission';
import {
	kycSubmissionResponseSchema,
	kycWinnerInputSchema,
} from '@/types/kyc-submission';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Submits a KYC winner verification request
 *
 * @param input - Winner verification data
 * @returns ServiceResponse with submission details on success
 */
export async function submitWinner(
	input: unknown,
): Promise<ServiceResponse<KycSubmissionResponse, KycSubmissionErrorCode>> {
	try {
		// Validate input shape — server actions are public endpoints,
		// callers can send arbitrary payloads
		const validatedInput = kycWinnerInputSchema.safeParse(input);
		if (!validatedInput.success) {
			return failure(COMMON_ERROR_CODES.VALIDATION_ERROR);
		}

		const response = await authenticatedClient.post(
			'/verification/kyc-winner',
			validatedInput.data,
			{ timeout: API_TIMEOUTS.MUTATION },
		);

		const parsed = kycSubmissionResponseSchema.parse(response.data);
		return success(parsed);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'kyc-submission', 'submit-winner');
			return failure(KYC_SUBMISSION_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapKycSubmissionError(error);
		captureServiceError(error, errorCode, {
			service: 'kyc-submission',
			action: 'submit-winner',
		});
		return failure(errorCode);
	}
}
