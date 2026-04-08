'use server';

import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/config';
import { failure, mapUpdateError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import {
	CLIENT_ERROR_CODES,
	UPDATE_ERROR_CODES,
	type UpdateErrorCode,
} from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';
import {
	uploadUpdateImagesResponseSchema,
	type UploadUpdateImagesResponse,
} from '@/types/update';
import { ZodError } from 'zod';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_IMAGES = 5;

/**
 * Response type for upload update images
 */
type UploadUpdateImagesServiceResponse = ServiceResponse<
	UploadUpdateImagesResponse,
	UpdateErrorCode
>;

/**
 * Uploads images for a raffle update
 *
 * @param updateId - The ID of the update to attach images to
 * @param files - Array of image files to upload (max 5)
 * @returns ServiceResponse with image URLs on success, UpdateErrorCode on failure
 */
export async function uploadUpdateImages(
	updateId: string,
	files: File[],
): Promise<UploadUpdateImagesServiceResponse> {
	try {
		// Client-side validation
		if (files.length === 0) {
			return failure(CLIENT_ERROR_CODES.UPLOAD_INVALID_TYPE);
		}

		if (files.length > MAX_IMAGES) {
			return failure(CLIENT_ERROR_CODES.UPLOAD_TOO_MANY_FILES);
		}

		// Validate each file
		for (const file of files) {
			if (!ACCEPTED_TYPES.includes(file.type)) {
				return failure(CLIENT_ERROR_CODES.UPLOAD_INVALID_TYPE);
			}

			if (file.size > MAX_SIZE) {
				return failure(CLIENT_ERROR_CODES.UPLOAD_TOO_LARGE);
			}
		}

		const formData = new FormData();
		// Backend expects multiple 'files' fields
		files.forEach(file => {
			formData.append('files', file);
		});

		const response = await authenticatedClient.post(
			`/updates/${updateId}/images`,
			formData,
			{
				timeout: API_TIMEOUTS.UPLOAD,
				headers: {
					// Axios detects FormData and sets Content-Type automatically
					'Content-Type': 'multipart/form-data',
				},
			},
		);

		// Validate response structure
		const parsed = uploadUpdateImagesResponseSchema.parse(response.data);

		return success(parsed);
	} catch (error) {
		// Handle validation errors
		if (error instanceof ZodError) {
			captureContractDrift(error, 'update', 'upload-update-images');
			return failure(UPDATE_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapUpdateError(error);
		return failure(errorCode);
	}
}
