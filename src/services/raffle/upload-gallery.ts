'use server';

import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/config';
import { failure, mapRaffleError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import {
	CLIENT_ERROR_CODES,
	RAFFLE_ERROR_CODES,
	type RaffleErrorCode,
} from '@/types/errors';
import {
	type UploadGalleryResponse,
	uploadGalleryResponseSchema,
} from '@/types/raffle';
import type { ServiceResponse } from '@/types/service-response';
import { ZodError } from 'zod';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_IMAGES = 10;

/**
 * Response type for gallery upload
 */
type UploadGalleryServiceResponse = ServiceResponse<
	UploadGalleryResponse,
	RaffleErrorCode
>;

/**
 * Uploads gallery images for a raffle
 *
 * @param raffleId - The ID of the raffle
 * @param files - Array of image files to upload
 * @returns ServiceResponse with gallery URLs on success, RaffleErrorCode on failure
 */
export async function uploadGalleryImages(
	raffleId: string,
	files: File[],
): Promise<UploadGalleryServiceResponse> {
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
			`/raffles/${raffleId}/gallery`,
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
		const parsed = uploadGalleryResponseSchema.parse(response.data);

		return success(parsed);
	} catch (error) {
		// Handle validation errors
		if (error instanceof ZodError) {
			captureContractDrift(error, 'raffle', 'upload-gallery');
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapRaffleError(error);
		return failure(errorCode);
	}
}
