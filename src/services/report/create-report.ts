'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { failure, success } from '@/lib/errors';
import { mapReportError } from '@/lib/errors/error-mapper';
import { REPORT_ERROR_CODES, type ReportErrorCode } from '@/types/errors';
import {
	type CreateReportPayload,
	createReportSchema,
	type UserReportResponse,
	userReportResponseSchema,
} from '@/types/report';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Response type for creating a content report
 */
type CreateReportServiceResponse = ServiceResponse<
	UserReportResponse,
	ReportErrorCode
>;

/**
 * Submits a content report to the moderation system
 *
 * @param payload - Report data including contentId, contentType, optional raffleId, and reason
 * @returns ServiceResponse with created report on success, ReportErrorCode on failure
 */
export async function createReport(
	payload: CreateReportPayload,
): Promise<CreateReportServiceResponse> {
	try {
		// Validate payload before sending — catches malformed data before network call
		const validationResult = createReportSchema.safeParse(payload);
		if (!validationResult.success) {
			console.error(
				'Report payload validation failed:',
				validationResult.error,
			);
			return failure(REPORT_ERROR_CODES.VALIDATION_FAILED);
		}

		const response = await authenticatedClient.post(
			'/reports',
			validationResult.data,
		);

		const validated = userReportResponseSchema.parse(response.data);

		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('Create report response validation failed:', error);
			return failure(REPORT_ERROR_CODES.VALIDATION_FAILED);
		}

		const errorCode = mapReportError(error);
		return failure(errorCode);
	}
}
