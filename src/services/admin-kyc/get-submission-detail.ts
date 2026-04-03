'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/config';
import { getSession } from '@/lib/auth/session';
import { failure, mapAdminKycError, success } from '@/lib/errors';
import { parsePermissions, PERMISSIONS } from '@/lib/permissions';
import { captureServiceError } from '@/lib/sentry/capture';
import type { AdminKycDetail } from '@/types/admin-kyc';
import { adminKycDetailSchema } from '@/types/admin-kyc';
import {
	ADMIN_KYC_ERROR_CODES,
	COMMON_ERROR_CODES,
	type AdminKycErrorCode,
} from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Fetches full detail of a single KYC submission for admin review.
 * Includes form data and documents (with signed URLs).
 *
 * @param id - Submission UUID
 * @returns ServiceResponse with submission detail
 */
export async function getSubmissionDetail(
	id: string,
): Promise<ServiceResponse<AdminKycDetail, AdminKycErrorCode>> {
	try {
		// Defense-in-depth: verify admin:kyc:review permission before calling backend.
		// The layout gate hides the UI, but server actions are directly callable.
		const session = await getSession();
		const permissions = parsePermissions(session?.user?.permissions);
		if (!permissions.includes(PERMISSIONS.KYC_REVIEW)) {
			return failure(COMMON_ERROR_CODES.FORBIDDEN);
		}

		const response = await authenticatedClient.get(
			`/admin/verification/${id}`,
			{
				timeout: API_TIMEOUTS.QUERY,
			},
		);

		const parsed = adminKycDetailSchema.parse(response.data);
		return success(parsed);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('Admin submission detail validation failed:', error);
			return failure(ADMIN_KYC_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapAdminKycError(error);
		captureServiceError(error, errorCode, {
			service: 'admin-kyc',
			action: 'get-submission-detail',
		});
		return failure(errorCode);
	}
}
