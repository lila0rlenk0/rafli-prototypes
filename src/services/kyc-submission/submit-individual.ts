'use server';

import { ZodError } from 'zod';

import { KYC_EVENTS } from '@/lib/analytics/events';
import { trackAfter } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/constants';
import { getSession } from '@/lib/auth/session';
import { failure, mapKycSubmissionError, success } from '@/lib/errors';
import {
	captureContractDrift,
	captureServiceError,
} from '@/lib/sentry/capture';
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
	const sessionPromise = getSession();

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

		// Must `await` trackAfter — it resolves IP via headers() in request
		// scope then defers Mixpanel via after(). `void trackAfter(...)` would
		// run headers() post-response and throw.
		const session = await sessionPromise;
		await trackAfter(
			KYC_EVENTS.INDIVIDUAL_SUBMITTED,
			{ submission_id: parsed.id },
			{ userId: session?.user?.id },
		);

		return success(parsed);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'kyc-submission', 'submit-individual');
			return failure(KYC_SUBMISSION_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapKycSubmissionError(error);
		captureServiceError(error, errorCode, {
			service: 'kyc-submission',
			action: 'submit-individual',
		});

		const session = await sessionPromise;
		await trackAfter(
			KYC_EVENTS.SUBMISSION_FAILED,
			{ type: 'individual', error_code: errorCode },
			{ userId: session?.user?.id },
		);

		return failure(errorCode);
	}
}
