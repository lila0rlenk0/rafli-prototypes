'use server';

import { ZodError } from 'zod';

import { MODERATION_EVENTS } from '@/lib/analytics/events';
import { trackServer } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { getSession } from '@/lib/auth/session';
import { failure, mapReportError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import { REPORT_ERROR_CODES, type ReportErrorCode } from '@/types/errors';
import {
	createReportSchema,
	type CreateReportPayload,
	type UserReportResponse,
	userReportResponseSchema,
} from '@/types/report';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Submits a content report for moderation
 *
 * Validates the payload client-side with Zod before sending.
 * Backend performs authorization + duplicate checks.
 *
 * @param payload - Report data (contentId, contentType, reason, optional raffleId)
 * @returns ServiceResponse with created report or error code
 */
export async function createReport(
	payload: CreateReportPayload,
): Promise<ServiceResponse<UserReportResponse, ReportErrorCode>> {
	const sessionPromise = Promise.resolve(getSession());

	try {
		// Step 1: Validate payload before sending to backend
		const parsed = createReportSchema.safeParse(payload);
		if (!parsed.success) {
			return failure(REPORT_ERROR_CODES.VALIDATION_FAILED);
		}

		// Step 2: POST to reports endpoint
		const response = await authenticatedClient.post('/reports', parsed.data);

		// Step 3: Validate response shape
		const validated = userReportResponseSchema.parse(response.data);

		// Fire-and-forget — report submission must not be delayed by analytics
		void sessionPromise.then(session =>
			trackServer(
				MODERATION_EVENTS.CONTENT_REPORTED,
				{
					content_type: parsed.data.contentType,
					content_id: parsed.data.contentId,
					reason: parsed.data.reason,
					has_raffle_context: !!parsed.data.raffleId,
				},
				{ userId: session?.user?.id },
			),
		);

		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'report', 'create-report');
			return failure(REPORT_ERROR_CODES.VALIDATION_FAILED);
		}
		return failure(mapReportError(error));
	}
}
