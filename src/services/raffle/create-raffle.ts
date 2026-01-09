'use server';

import { AxiosError } from 'axios';

import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/config';
import type { CreateRaffleInput } from '@/types/raffle';
import { createRafflePayloadSchema, raffleSchema } from '@/types/raffle';

// TODO: Change to backend categories
const CATEGORY_ID_MAP: Record<string, string> = {
	electronics: '019ba0f7-020c-7000-8071-1e7aa7e6ad91',
	wearables: '019ba0f7-4282-7000-a420-10b30004144e',
	accessories: '019ba0f7-58c7-7000-9522-f4241d527bf3',
	'home-appliances': '019ba0f7-7461-7000-b4ce-a6a0f35f1865',
};

export async function createRaffle(input: CreateRaffleInput) {
	try {
		const categoryId = CATEGORY_ID_MAP[input.category];
		if (!categoryId) {
			return { error: 'Invalid category' };
		}

		const payload = {
			title: input.title,
			description: input.description,
			declaredValueAmount: input.price.toString(),
			declaredValueCurrency: 'USD',
			categoryId,
			startAt: new Date(input.startDate).toISOString(),
			endAt: new Date(input.endDate).toISOString(),
			ticketPriceAmount: input.pricePerTicket.toString(),
			ticketPriceCurrency: 'USD',
			numberOfWinners: input.numberOfWinners,
			minParticipants: input.minParticipants,
			maxParticipants: input.maxParticipants,
			deliveryIncluded: false,
			coverMediaUrl: '',
			galleryMediaUrls: [],
			timezone: input.timezone,
		};

		const validationResult = createRafflePayloadSchema.safeParse(payload);
		if (!validationResult.success) {
			return { error: 'Invalid raffle data' };
		}

		const response = await authenticatedClient.post(
			'/raffles',
			validationResult.data,
			{ timeout: API_TIMEOUTS.MUTATION },
		);

		const raffle = raffleSchema.parse(response.data);

		return {
			success: true,
			raffle,
		};
	} catch (error) {
		if (error instanceof AxiosError) {
			if (error.code === 'ECONNABORTED') {
				return { error: 'Request timeout. Please try again.' };
			}
			return {
				error: error.response?.data?.message || 'Failed to create raffle',
			};
		}
		console.error(error);
		return { error: 'Network error' };
	}
}
