'use server';

import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/config';
import { env } from '@/env/server';
import { failure, mapRaffleError, success } from '@/lib/errors';
import {
	CLIENT_ERROR_CODES,
	RAFFLE_ERROR_CODES,
	type RaffleErrorCode,
} from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';
import { uploadAvatarResponseSchema } from '@/types/user';
import { ZodError } from 'zod';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Response type for avatar upload
 * Returns { avatarUrl: string } - full URL constructed from backend response
 */
type UploadAvatarServiceResponse = ServiceResponse<
	{ avatarUrl: string },
	RaffleErrorCode
>;

/**
 * Uploads a user avatar image
 *
 * @param file - The image file to upload
 * @returns ServiceResponse with avatar URL on success, RaffleErrorCode on failure
 */
export async function uploadAvatar(
	file: File,
): Promise<UploadAvatarServiceResponse> {
	try {
		// Client-side validation
		if (!ACCEPTED_TYPES.includes(file.type)) {
			return failure(CLIENT_ERROR_CODES.UPLOAD_INVALID_TYPE);
		}

		if (file.size > MAX_SIZE) {
			return failure(CLIENT_ERROR_CODES.UPLOAD_TOO_LARGE);
		}

		const formData = new FormData();
		// Backend expects 'file' field for avatar upload
		formData.append('file', file);

		const response = await authenticatedClient.post('/me/avatar', formData, {
			timeout: API_TIMEOUTS.UPLOAD,
			headers: {
				// Axios detects FormData and sets Content-Type automatically
				'Content-Type': 'multipart/form-data',
			},
		});

		// Validate response structure
		const parsed = uploadAvatarResponseSchema.parse(response.data);

		// Build full avatar URL from relative path
		const storageBaseUrl = env.STORAGE_MEDIA_URL_USER_AVATARS.replace(/\/$/, '');
		const imagePath = parsed.image.startsWith('/') ? parsed.image : `/${parsed.image}`;
		const avatarUrl = `${storageBaseUrl}${imagePath}`;

		const result: { avatarUrl: string } = { avatarUrl };
		return success(result);
	} catch (error) {
		// Handle validation errors
		if (error instanceof ZodError) {
			console.error('Avatar upload response validation failed:', error);
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapRaffleError(error);
		return failure(errorCode);
	}
}
