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
import type { ServiceResponse } from '@/types/service-response';
import {
	verificationStatusResponseSchema,
	type VerificationStatusResponse,
} from '@/types/verification-status';

/**
 * Fetches the current user's aggregate verification status.
 * Unlike getMySubmissions() which returns the full submission list,
 * this returns a single status object representing the user's overall
 * verification state (none, draft, in_review, approved, rejected).
 *
 * @returns ServiceResponse with verification status on success
 */
export async function getVerificationStatus(): Promise<
	ServiceResponse<VerificationStatusResponse, KycSubmissionErrorCode>
> {
	try {
		const response = await authenticatedClient.get('/me/verification/status', {
			timeout: API_TIMEOUTS.QUERY,
		});

		return success(verificationStatusResponseSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'kyc-submission', 'get-verification-status');
			return failure(KYC_SUBMISSION_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapKycSubmissionError(error);
		captureServiceError(error, errorCode, {
			service: 'kyc-submission',
			action: 'get-verification-status',
		});
		return failure(errorCode);
	}
}
