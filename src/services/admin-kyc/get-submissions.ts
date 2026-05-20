'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/constants';
import { getSession } from '@/lib/auth/session';
import { failure, mapAdminKycError, success } from '@/lib/errors';
import { parsePermissions, PERMISSIONS } from '@/lib/permissions';
import {
	captureContractDrift,
	captureServiceError,
} from '@/lib/sentry/capture';
import type { AdminKycListResponse, AdminKycQuery } from '@/types/admin-kyc';
import { adminKycListResponseSchema } from '@/types/admin-kyc';
import {
	ADMIN_KYC_ERROR_CODES,
	COMMON_ERROR_CODES,
	type AdminKycErrorCode,
} from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Fetches paginated KYC submissions for admin review.
 * Supports filtering by status and verification type.
 *
 * @param query - Optional filters: page, limit, status, type
 * @returns ServiceResponse with paginated list of submissions
 */
export async function getAdminSubmissions(
	query?: AdminKycQuery,
): Promise<ServiceResponse<AdminKycListResponse, AdminKycErrorCode>> {
	try {
		// Step 1: Defense-in-depth permission check — server actions are directly callable
		const session = await getSession();
		const permissions = parsePermissions(session?.user?.permissions);
		if (!permissions.includes(PERMISSIONS.KYC_REVIEW)) {
			return failure(COMMON_ERROR_CODES.FORBIDDEN);
		}

		// Step 2: Fetch paginated submissions with optional status/type filters.
		// Backend uses offset-based pagination (matching notifications, promo-codes,
		// updates). Translate the caller-facing `page` into the wire `offset` here
		// so callers can keep thinking in 1-indexed pages.
		const limit = query?.limit ?? 20;
		const page = query?.page ?? 1;
		const offset = (page - 1) * limit;
		const response = await authenticatedClient.get('/admin/verification', {
			params: {
				limit,
				offset,
				status: query?.status,
				type: query?.type,
			},
			timeout: API_TIMEOUTS.QUERY,
		});

		// Step 3: Validate response shape
		return success(adminKycListResponseSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'admin-kyc', 'get-submissions');
			return failure(ADMIN_KYC_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapAdminKycError(error);
		captureServiceError(error, errorCode, {
			service: 'admin-kyc',
			action: 'get-submissions',
		});
		return failure(errorCode);
	}
}
