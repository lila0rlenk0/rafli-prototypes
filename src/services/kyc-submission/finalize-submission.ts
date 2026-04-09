'use server';

import { KYC_EVENTS } from '@/lib/analytics/events';
import { trackServer } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/config';
import { getSession } from '@/lib/auth/session';
import { failure, mapKycSubmissionError, success } from '@/lib/errors';
import { captureServiceError } from '@/lib/sentry/capture';
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
	const sessionPromise = Promise.resolve(getSession());

	try {
		await authenticatedClient.post(
			`/verification/${submissionId}/finalize`,
			undefined,
			{ timeout: API_TIMEOUTS.MUTATION },
		);

		// Track KYC finalization — end of verification submission funnel
		void sessionPromise.then(session =>
			trackServer(
				KYC_EVENTS.FINALIZED,
				{ submission_id: submissionId },
				{ userId: session?.user?.id },
			),
		);

		return success(undefined);
	} catch (error) {
		const errorCode = mapKycSubmissionError(error);
		captureServiceError(error, errorCode, {
			service: 'kyc-submission',
			action: 'finalize-submission',
		});

		void sessionPromise.then(session =>
			trackServer(
				KYC_EVENTS.SUBMISSION_FAILED,
				{
					type: 'finalize',
					submission_id: submissionId,
					error_code: errorCode,
				},
				{ userId: session?.user?.id },
			),
		);

		return failure(errorCode);
	}
}
