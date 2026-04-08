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
	type UploadCoverResponse,
	uploadCoverResponseSchema,
} from '@/types/raffle';
import type { ServiceResponse } from '@/types/service-response';
import { ZodError } from 'zod';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Response type for cover upload
 */
type UploadCoverServiceResponse = ServiceResponse<
	UploadCoverResponse,
	RaffleErrorCode
>;

/**
 * Uploads a cover image for a raffle
 *
 * @param raffleId - The ID of the raffle
 * @param file - The image file to upload
 * @returns ServiceResponse with cover URL on success, RaffleErrorCode on failure
 */
export async function uploadCover(
	raffleId: string,
	file: File,
): Promise<UploadCoverServiceResponse> {
	try {
		// Client-side validation
		if (!ACCEPTED_TYPES.includes(file.type)) {
			return failure(CLIENT_ERROR_CODES.UPLOAD_INVALID_TYPE);
		}

		if (file.size > MAX_SIZE) {
			return failure(CLIENT_ERROR_CODES.UPLOAD_TOO_LARGE);
		}

		const formData = new FormData();
		// Backend expects 'file' field for single upload
		formData.append('file', file);

		const response = await authenticatedClient.post(
			`/raffles/${raffleId}/cover`,
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
		const parsed = uploadCoverResponseSchema.parse(response.data);

		return success(parsed);
	} catch (error) {
		// Handle validation errors
		if (error instanceof ZodError) {
			captureContractDrift(error, 'raffle', 'upload-cover');
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapRaffleError(error);
		return failure(errorCode);
	}
}
