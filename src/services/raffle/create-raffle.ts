'use server';

import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/config';
import { failure, success } from '@/lib/errors';
import { mapRaffleError } from '@/lib/errors';
import {
	CLIENT_ERROR_CODES,
	RAFFLE_ERROR_CODES,
	type RaffleErrorCode,
} from '@/types/errors';
import type { CreateRaffleInput, Raffle } from '@/types/raffle';
import { createRafflePayloadSchema, raffleSchema } from '@/types/raffle';
import type { ServiceResponse } from '@/types/service-response';
import { ZodError } from 'zod';

// TODO: Change to backend categories
const CATEGORY_ID_MAP: Record<string, string> = {
	electronics: '019ba0f7-020c-7000-8071-1e7aa7e6ad91',
	wearables: '019ba0f7-4282-7000-a420-10b30004144e',
	accessories: '019ba0f7-58c7-7000-9522-f4241d527bf3',
	'home-appliances': '019ba0f7-7461-7000-b4ce-a6a0f35f1865',
};

/**
 * Response type for raffle creation
 */
type CreateRaffleResponse = ServiceResponse<Raffle, RaffleErrorCode>;

/**
 * Creates a new raffle
 *
 * @param input - Raffle creation data
 * @returns ServiceResponse with created raffle on success, RaffleErrorCode on failure
 */
export async function createRaffle(
	input: CreateRaffleInput,
): Promise<CreateRaffleResponse> {
	try {
		const categoryId = CATEGORY_ID_MAP[input.category];
		if (!categoryId) {
			return failure(CLIENT_ERROR_CODES.RAFFLE_INVALID_CATEGORY);
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

		// Validate payload before sending
		const validationResult = createRafflePayloadSchema.safeParse(payload);
		if (!validationResult.success) {
			console.error('Payload validation failed:', validationResult.error);
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		const response = await authenticatedClient.post(
			'/raffles',
			validationResult.data,
			{ timeout: API_TIMEOUTS.MUTATION },
		);

		// Validate response structure
		const raffle = raffleSchema.parse(response.data);

		return success(raffle);
	} catch (error) {
		// Handle validation errors
		if (error instanceof ZodError) {
			console.error('Raffle response validation failed:', error);
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapRaffleError(error);
		return failure(errorCode);
	}
}
