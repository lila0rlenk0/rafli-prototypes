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
	type UploadCoverResponse,
	uploadCoverResponseSchema,
} from '@/types/raffle';
import type { ServiceResponse } from '@/types/service-response';
import { ZodError } from 'zod';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
// 5 MB
const MAX_SIZE = 5 * 1024 * 1024;

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
): Promise<ServiceResponse<UploadCoverResponse, RaffleErrorCode>> {
	const sessionPromise = Promise.resolve(getSession());

	try {
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
			`/raffles/${pathParam(raffleId)}/cover`,
			formData,
			{
				timeout: API_TIMEOUTS.UPLOAD,
				headers: {
					// Axios detects FormData and sets Content-Type automatically
					'Content-Type': 'multipart/form-data',
				},
			},
		);

		const parsed = uploadCoverResponseSchema.parse(response.data);

		// Must `await` trackAfter — it resolves IP via headers() in request
		// scope then defers Mixpanel via after(). `void trackAfter(...)` would
		// run headers() post-response and throw.
		const session = await sessionPromise;
		await trackAfter(
			RAFFLE_EVENTS.COVER_UPLOADED,
			{
				raffle_id: raffleId,
				file_type: file.type,
				file_size_bytes: file.size,
			},
			{ userId: session?.user?.id },
		);

		return success(parsed);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'raffle', 'upload-cover');
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		return failure(mapRaffleError(error));
	}
}
