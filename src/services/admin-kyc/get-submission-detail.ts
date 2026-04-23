'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/constants';
import { pathParam } from '@/lib/utils/routing/path-param';
import { getSession } from '@/lib/auth/session';
import { failure, mapAdminKycError, success } from '@/lib/errors';
import { parsePermissions, PERMISSIONS } from '@/lib/permissions';
import {
	captureContractDrift,
	captureServiceError,
} from '@/lib/sentry/capture';
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
		// Step 1: Defense-in-depth permission check — server actions are directly callable
		const session = await getSession();
		const permissions = parsePermissions(session?.user?.permissions);
		if (!permissions.includes(PERMISSIONS.KYC_REVIEW)) {
			return failure(COMMON_ERROR_CODES.FORBIDDEN);
		}

		// Step 2: Fetch submission detail with signed document URLs
		const response = await authenticatedClient.get(
			`/admin/verification/${pathParam(id)}`,
			{
				timeout: API_TIMEOUTS.QUERY,
			},
		);

		// Step 3: Validate response shape
		return success(adminKycDetailSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'admin-kyc', 'get-submission-detail');
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
