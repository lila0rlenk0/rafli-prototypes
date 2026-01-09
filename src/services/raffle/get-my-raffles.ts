'use server';

import { AxiosError } from 'axios';
import { z } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import {
	type ListRafflesResponse,
	type MyRafflesQuery,
	raffleSchema,
	RaffleStatus,
} from '@/types/raffle';

/**
 * Fetches the current user's raffles with optional filtering
 *
 * @param query - Optional query parameters for filtering raffles
 * @returns List of raffles or error message
 */
export async function getMyRaffles(
	query?: MyRafflesQuery,
): Promise<ListRafflesResponse | { error: string }> {
	try {
		// Build query params
		const params: Record<string, string> = {
			status: query?.status || RaffleStatus.Draft,
		};

		if (query?.category) params.category = query.category;
		if (query?.limit) params.limit = query.limit.toString();
		if (query?.page) params.page = query.page.toString();
		if (query?.sort) params.sort = query.sort;
		const response = await authenticatedClient.get('/me/raffles', {
			params,
		});

		// Validate response data structure
		const listSchema = z.object({
			limit: z.number(),
			page: z.number(),
			raffles: z.array(raffleSchema),
			total: z.number(),
			totalPages: z.number(),
		});

		return listSchema.parse(response.data);
	} catch (error) {
		if (error instanceof AxiosError) {
			return {
				error: error.response?.data?.message || 'Failed to fetch raffles',
			};
		}
		console.error('Get my raffles error:', error);
		return { error: 'Something went wrong while fetching raffles' };
	}
}
