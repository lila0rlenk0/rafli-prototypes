'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { failure, success } from '@/lib/errors';
import { mapReportError } from '@/lib/errors/error-mapper';
import { REPORT_ERROR_CODES, type ReportErrorCode } from '@/types/errors';
import {
	type CreateReportPayload,
	type UserReportResponse,
	userReportResponseSchema,
} from '@/types/report';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Submits a content report to the moderation system
 *
 * @param payload - Report data including contentId, contentType, optional raffleId, and reason
 * @returns ServiceResponse with created report on success, ReportErrorCode on failure
 */
export async function createReport(
	payload: CreateReportPayload,
): Promise<ServiceResponse<UserReportResponse, ReportErrorCode>> {
	try {
		const response = await authenticatedClient.post('/reports', payload);
		const validated = userReportResponseSchema.parse(response.data);
		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			// Backend returned a shape we don't recognise — treat as validation failure
			console.error('Create report response validation failed:', error);
			return failure(REPORT_ERROR_CODES.VALIDATION_FAILED);
		}
		return failure(mapReportError(error));
	}
}
