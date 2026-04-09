'use server';

import { ZodError } from 'zod';

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

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_IMAGES = 5;

/**
 * Uploads images for a raffle update.
 *
 * Backend expects multiple 'files' fields in the FormData.
 *
 * @param updateId - The ID of the update to attach images to
 * @param files - Array of image files to upload (max 5)
 * @returns ServiceResponse with image URLs on success, UpdateErrorCode on failure
 */
export async function uploadUpdateImages(
	updateId: string,
	files: File[],
): Promise<ServiceResponse<UploadUpdateImagesResponse, UpdateErrorCode>> {
	try {
		// Step 1: Guard — at least one file required
		if (files.length === 0) {
			return failure(CLIENT_ERROR_CODES.UPLOAD_INVALID_TYPE);
		}

		// Step 2: Guard — max 5 images per update
		if (files.length > MAX_IMAGES) {
			return failure(CLIENT_ERROR_CODES.UPLOAD_TOO_MANY_FILES);
		}

		// Step 3: Validate each file's type and size
		for (const file of files) {
			if (!ACCEPTED_TYPES.includes(file.type)) {
				return failure(CLIENT_ERROR_CODES.UPLOAD_INVALID_TYPE);
			}

			if (file.size > MAX_SIZE) {
				return failure(CLIENT_ERROR_CODES.UPLOAD_TOO_LARGE);
			}
		}

		// Step 4: Build multipart form and upload — backend expects multiple 'files' fields
		const formData = new FormData();
		files.forEach(file => {
			formData.append('files', file);
		});

		const response = await authenticatedClient.post(
			`/updates/${updateId}/images`,
			formData,
			{
				timeout: API_TIMEOUTS.UPLOAD,
				headers: {
					'Content-Type': 'multipart/form-data',
				},
			},
		);

		// Step 5: Validate response — contains uploaded image URLs
		return success(uploadUpdateImagesResponseSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'update', 'upload-update-images');
			return failure(UPDATE_ERROR_CODES.FETCH_FAILED);
		}

		return failure(mapUpdateError(error));
	}
}
