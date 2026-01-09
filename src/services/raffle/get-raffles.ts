'use server';

import { AxiosError } from 'axios';

import { baseClient } from '@/lib/api/client';
import { buildQueryParams } from '@/lib/api/utils';
import {
	type ListRafflesResponse,
	listRafflesResponseSchema,
	type MyRafflesQuery,
} from '@/types/raffle';

/**
 * Fetches all raffles with optional filtering (public/browsing)
 *
 * @param query - Optional query parameters for filtering raffles
 * @returns List of raffles or error message
 */
export async function getRaffles(
	query?: MyRafflesQuery,
): Promise<ListRafflesResponse | { error: string }> {
	try {
		const params = buildQueryParams(query);

		const response = await baseClient.get('/raffles', {
			params,
		});

		// Validate response data structure
		return listRafflesResponseSchema.parse(response.data);
	} catch (error) {
		if (error instanceof AxiosError) {
			return {
				error: error.response?.data?.message || 'Failed to fetch raffles',
			};
		}
		console.error('Get raffles error:', error);
		return { error: 'Something went wrong while fetching raffles' };
	}
}
