'use server';

import { env } from '@/env/client';
import { getAuthToken } from '@/lib/auth/session';
import {
	ListRafflesResponse,
	MyRafflesQuery,
	raffleSchema,
	RaffleStatus,
} from '@/types/raffle';
import { z } from 'zod';

export async function getMyRaffles(
	query?: MyRafflesQuery,
): Promise<ListRafflesResponse | { error: string }> {
	try {
		const token = await getAuthToken();

		if (!token) {
			return { error: 'You must be signed in to view your raffles' };
		}

		const params = new URLSearchParams();
		if (query?.category) params.append('category', query.category);
		if (query?.limit) params.append('limit', query.limit.toString());
		if (query?.page) params.append('page', query.page.toString());
		if (query?.sort) params.append('sort', query.sort);
		if (query?.status) params.append('status', query.status);
		else params.append('status', RaffleStatus.Draft); // Default to draft if not specified

		const response = await fetch(
			`${env.NEXT_PUBLIC_BACKEND_URL}/me/raffles?${params.toString()}`,
			{
				method: 'GET',
				headers: {
					Authorization: `Bearer ${token}`,
				},
				cache: 'no-store',
			},
		);

		if (!response.ok) {
			return { error: 'Failed to fetch raffles' };
		}

		const data = await response.json();

		// Validate response data structure
		const listSchema = z.object({
			limit: z.number(),
			page: z.number(),
			raffles: z.array(raffleSchema),
			total: z.number(),
			totalPages: z.number(),
		});

		return listSchema.parse(data);
	} catch (error) {
		console.error('Get my raffles error:', error);
		return { error: 'Something went wrong while fetching raffles' };
	}
}
