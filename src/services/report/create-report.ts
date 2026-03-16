'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { failure, mapReportError, success } from '@/lib/errors';
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
		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('Create report response validation failed:', error);
			return failure(REPORT_ERROR_CODES.VALIDATION_FAILED);
		}
		return failure(mapReportError(error));
	}
}
