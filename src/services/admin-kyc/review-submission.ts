'use server';

import { revalidatePath } from 'next/cache';
import { runAfter } from '@/lib/utils/run-after';
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
import type { AdminKycReviewResponse } from '@/types/admin-kyc';
import {
	adminKycReviewInputSchema,
	adminKycReviewResponseSchema,
} from '@/types/admin-kyc';
import {
	ADMIN_KYC_ERROR_CODES,
	COMMON_ERROR_CODES,
	type AdminKycErrorCode,
} from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Submits an admin review decision (approve/reject) for a KYC submission.
 * Revalidates the admin verification pages on success so the list
 * and detail views reflect the updated status.
 *
 * @param id - Submission UUID to review
 * @param input - Review decision and optional rejection reason
 * @returns ServiceResponse with updated submission status
 */
export async function reviewSubmission(
	id: string,
	input: unknown,
): Promise<ServiceResponse<AdminKycReviewResponse, AdminKycErrorCode>> {
	try {
		// Step 1: Defense-in-depth permission check — server actions are directly callable,
		// the layout gate only hides the UI
		const session = await getSession();
		const permissions = parsePermissions(session?.user?.permissions);
		if (!permissions.includes(PERMISSIONS.KYC_REVIEW)) {
			return failure(COMMON_ERROR_CODES.FORBIDDEN);
		}

		// Step 2: Validate input shape — server actions are public endpoints,
		// callers can send arbitrary payloads
		const validatedInput = adminKycReviewInputSchema.safeParse(input);
		if (!validatedInput.success) {
			return failure(COMMON_ERROR_CODES.VALIDATION_ERROR);
		}

		// Step 3: Submit review decision to backend
		const response = await authenticatedClient.patch(
			`/admin/verification/${pathParam(id)}/review`,
			validatedInput.data,
			{
				timeout: API_TIMEOUTS.MUTATION,
			},
		);

		// Step 4: Validate response shape
		const data = adminKycReviewResponseSchema.parse(response.data);

		// Step 5: Revalidate admin verification pages so list and detail reflect updated status
		// Revalidation targets: /admin/verification (list) and /admin/verification/:id (detail)
		runAfter(() => {
			revalidatePath('/admin/verification', 'page');
			revalidatePath(`/admin/verification/${pathParam(id)}`, 'page');
		});

		return success(data);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'admin-kyc', 'review-submission');
			return failure(ADMIN_KYC_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapAdminKycError(error);
		captureServiceError(error, errorCode, {
			service: 'admin-kyc',
			action: 'review-submission',
		});
		return failure(errorCode);
	}
}
