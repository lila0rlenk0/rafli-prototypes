'use server';

import { env } from '@/env/client';
import { getAuthToken } from '@/lib/auth/session';
import type { CreateRaffleInput } from '@/types/raffle';
import { createRafflePayloadSchema, raffleSchema } from '@/types/raffle';

// TODO: Change to backend categories
const CATEGORY_ID_MAP: Record<string, string> = {
	electronics: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
	wearables: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
	accessories: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
	'home-appliances': 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
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
			timezone: 'America/Sao_Paulo',
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
