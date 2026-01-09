'use server';

import { AxiosError } from 'axios';

import { baseClient } from '@/lib/api/client';
import { type Raffle, raffleSchema } from '@/types/raffle';

/**
 * Fetches a single raffle by ID
 *
 * @param id - The ID of the raffle to fetch
 * @returns The raffle object or an error
 */
export async function getRaffle(
	id: string,
): Promise<Raffle | { error: string }> {
	try {
		const response = await baseClient.get(`/raffles/${id}`);

		return raffleSchema.parse(response.data);
	} catch (error) {
		if (error instanceof AxiosError) {
			return {
				error: error.response?.data?.message || 'Failed to fetch raffle',
			};
		}
		console.error('Get raffle error:', error);
		return { error: 'Something went wrong while fetching the raffle' };
	}
}
