'use server';

import { RAFFLE_EVENTS } from '@/lib/analytics/events';
import { trackAfter } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/constants';
import { pathParam } from '@/lib/utils/routing/path-param';
import { getSession } from '@/lib/auth/session';
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
// 5 MB
const MAX_SIZE = 5 * 1024 * 1024;
const MAX_IMAGES = 10;

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
): Promise<ServiceResponse<UploadGalleryResponse, RaffleErrorCode>> {
	const sessionPromise = Promise.resolve(getSession());

	try {
		if (files.length === 0) {
			return failure(CLIENT_ERROR_CODES.UPLOAD_INVALID_TYPE);
		}

		if (files.length > MAX_IMAGES) {
			return failure(CLIENT_ERROR_CODES.UPLOAD_TOO_MANY_FILES);
		}

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
			`/raffles/${pathParam(raffleId)}/gallery`,
			formData,
			{
				timeout: API_TIMEOUTS.UPLOAD,
				headers: {
					// Axios detects FormData and sets Content-Type automatically
					'Content-Type': 'multipart/form-data',
				},
			},
		);

		const parsed = uploadGalleryResponseSchema.parse(response.data);

		// Must `await` trackAfter — it resolves IP via headers() in request
		// scope then defers Mixpanel via after(). `void trackAfter(...)` would
		// run headers() post-response and throw.
		const session = await sessionPromise;
		await trackAfter(
			RAFFLE_EVENTS.GALLERY_UPLOADED,
			{
				raffle_id: raffleId,
				image_count: files.length,
				total_size_bytes: files.reduce((sum, f) => sum + f.size, 0),
			},
			{ userId: session?.user?.id },
		);

		return success(parsed);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'raffle', 'upload-gallery');
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		return failure(mapRaffleError(error));
	}
}
