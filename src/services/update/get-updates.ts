'use server';

import { baseClient } from '@/lib/api/client';
import { failure, mapUpdateError, success } from '@/lib/errors';
import { UPDATE_ERROR_CODES, type UpdateErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';
import {
	listUpdatesResponseSchema,
	type ListUpdatesResponse,
} from '@/types/update';
import { env } from '@/env/server';
import { ZodError } from 'zod';

/**
 * Response type for getting updates
 */
type GetUpdatesServiceResponse = ServiceResponse<
	ListUpdatesResponse,
	UpdateErrorCode
>;

/**
 * Optional pagination parameters for fetching updates
 */
interface GetUpdatesParams {
	limit?: number;
	offset?: number;
}

/**
 * Builds a full media URL from a relative path
 * @param relativePath - The relative path from the backend
 * @returns Full URL with storage base URL prepended
 */
function buildMediaUrl(relativePath: string): string {
	const storageBaseUrl = env.STORAGE_MEDIA_URL.replace(/\/$/, '');
	const imagePath = relativePath.startsWith('/')
		? relativePath
		: `/${relativePath}`;
	return `${storageBaseUrl}${imagePath}`;
}

/**
 * Checks if a string is already a valid absolute URL
 * @param url - URL string to check
 * @returns true if already absolute URL, false if relative path
 */
function isAbsoluteUrl(url: string): boolean {
	try {
		new URL(url);
		return true;
	} catch {
		return false;
	}
}

/**
 * Fetches updates for a raffle
 *
 * @param raffleId - The ID of the raffle
 * @param params - Optional pagination parameters (limit, offset)
 * @returns ServiceResponse with updates list on success, UpdateErrorCode on failure
 */
export async function getUpdates(
	raffleId: string,
	params?: GetUpdatesParams,
): Promise<GetUpdatesServiceResponse> {
	try {
		const response = await baseClient.get(`/raffles/${raffleId}/updates`, {
			params: {
				limit: params?.limit,
				offset: params?.offset,
			},
		});
		const validated = listUpdatesResponseSchema.parse(response.data);

		// Transform relative image paths to full URLs
		const transformedItems = validated.items.map(item => ({
			...item,
			imageUrls: item.imageUrls.map(url =>
				isAbsoluteUrl(url) ? url : buildMediaUrl(url),
			),
		}));

		return success({
			...validated,
			items: transformedItems,
		});
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('Updates response validation failed:', error);
			return failure(UPDATE_ERROR_CODES.FETCH_FAILED);
		}
		return failure(mapUpdateError(error));
	}
}
