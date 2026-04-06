'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { captureServiceError } from '@/lib/sentry/capture';
import { API_TIMEOUTS } from '@/lib/api/config';
import { failure, mapKycSubmissionError, success } from '@/lib/errors';
import {
	COMMON_ERROR_CODES,
	KYC_SUBMISSION_ERROR_CODES,
	type KycSubmissionErrorCode,
} from '@/types/errors';
import type { KycSubmissionResponse } from '@/types/kyc-submission';
import {
	kybIndividualInputSchema,
	kycSubmissionResponseSchema,
} from '@/types/kyc-submission';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Submits a KYB individual verification request
 *
 * @param input - Individual host verification data
 * @returns ServiceResponse with submission details on success
 */
export async function submitIndividual(
	input: unknown,
): Promise<ServiceResponse<KycSubmissionResponse, KycSubmissionErrorCode>> {
	try {
		// Validate input shape — server actions are public endpoints,
		// callers can send arbitrary payloads
		const validatedInput = kybIndividualInputSchema.safeParse(input);
		if (!validatedInput.success) {
			return failure(COMMON_ERROR_CODES.VALIDATION_ERROR);
		}

		const response = await authenticatedClient.post(
			'/verification/kyb-individual',
			validatedInput.data,
			{ timeout: API_TIMEOUTS.MUTATION },
		);

		const parsed = kycSubmissionResponseSchema.parse(response.data);
		return success(parsed);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('KYB individual response validation failed:', error);
			return failure(KYC_SUBMISSION_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapKycSubmissionError(error);
		captureServiceError(error, errorCode, {
			service: 'kyc-submission',
			action: 'submit-individual',
		});
		return failure(errorCode);
	}
}
