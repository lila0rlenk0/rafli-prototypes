'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/constants';
import { failure, mapRaffleError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import {
	CLIENT_ERROR_CODES,
	COMMON_ERROR_CODES,
	type RaffleErrorCode,
} from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';
import { uploadAvatarResponseSchema } from '@/types/user';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
// 5 MB
const MAX_SIZE = 5 * 1024 * 1024;

/**
 * Uploads a user avatar image.
 *
 * Returns void on success — caller should revalidate /me to get the updated URL.
 * Backend expects 'file' field for avatar upload.
 *
 * @param file - The image file to upload
 * @returns ServiceResponse void on success, RaffleErrorCode on failure
 */
export async function uploadAvatar(
	file: File,
): Promise<ServiceResponse<undefined, RaffleErrorCode>> {
	try {
		// Step 1: Validate file type — reject unsupported formats before upload
		if (!ACCEPTED_TYPES.includes(file.type)) {
			return failure(CLIENT_ERROR_CODES.UPLOAD_INVALID_TYPE);
		}

		// Step 2: Validate file size — reject oversized files (5MB limit)
		if (file.size > MAX_SIZE) {
			return failure(CLIENT_ERROR_CODES.UPLOAD_TOO_LARGE);
		}

		// Step 3: Upload avatar — backend expects 'file' field
		// Side-effects: caller should revalidate /me to get updated avatar URL
		const formData = new FormData();
		formData.append('file', file);

		const response = await authenticatedClient.post('/me/avatar', formData, {
			timeout: API_TIMEOUTS.UPLOAD,
			headers: {
				'Content-Type': 'multipart/form-data',
			},
		});

		// Step 4: Validate response to detect contract drift
		uploadAvatarResponseSchema.parse(response.data);

		return success(undefined);
	} catch (error) {
		if (error instanceof ZodError) {
			// Contract drift on user-domain response — use the cross-domain
			// VALIDATION_ERROR convention shared by all services (see sign-in-user.ts)
			captureContractDrift(error, 'user', 'upload-avatar');
			return failure(COMMON_ERROR_CODES.VALIDATION_ERROR);
		}

		return failure(mapRaffleError(error));
	}
}
