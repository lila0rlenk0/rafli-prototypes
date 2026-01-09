'use server';

import { env } from '@/env/client';
import { getAuthToken } from '@/lib/auth/session';
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
		const token = await getAuthToken();

		if (!token) {
			return { error: 'You must be signed in to create a raffle' };
		}

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

		const response = await fetch(`${env.NEXT_PUBLIC_BACKEND_URL}/raffles`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(validationResult.data),
		});

		const data = await response.json();
		if (!response.ok) {
			return { error: 'Failed to create raffle' };
		}

		const raffle = raffleSchema.parse(data);

		return {
			success: true,
			raffle,
		};
	} catch (error) {
		console.error(error);
		return { error: 'Network error' };
	}
}
