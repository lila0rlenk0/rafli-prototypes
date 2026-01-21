'use server';

import { ZodError } from 'zod';

import { getCategoryId } from '@/constants/categories';
import { RAFFLE_EVENTS } from '@/lib/analytics/events';
import { trackServer } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/config';
import { getSession } from '@/lib/auth/session';
import { failure, mapRaffleError, success } from '@/lib/errors';
import {
	CLIENT_ERROR_CODES,
	RAFFLE_ERROR_CODES,
	type RaffleErrorCode,
} from '@/types/errors';
import type { CreateRaffleInput, Raffle } from '@/types/raffle';
import { createRafflePayloadSchema, raffleSchema } from '@/types/raffle';
import type { ServiceResponse } from '@/types/service-response';

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
	const session = await getSession();
	const userId = session?.user?.id;

	try {
		const categoryId = getCategoryId(input.category);
		if (!categoryId) {
			return failure(CLIENT_ERROR_CODES.RAFFLE_INVALID_CATEGORY);
		}

		const payload = {
			title: input.title,
			description: input.description,
			declaredValueAmount: input.price.toString(),
			declaredValueCurrency: 'USD',
			categoryId,
			questionId: input.checkInQuestion,
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

		// Track raffle created (awaited to ensure completion in serverless)
		await trackServer(
			RAFFLE_EVENTS.CREATED,
			{
				raffle_id: raffle.id,
				category: input.category,
				ticket_price: input.pricePerTicket,
				max_participants: input.maxParticipants,
			},
			{ userId },
		);

		return success(raffle);
	} catch (error) {
		// Handle validation errors
		if (error instanceof ZodError) {
			console.error('Raffle response validation failed:', error);
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapRaffleError(error);

		// Track raffle creation failed (awaited to ensure completion in serverless)
		await trackServer(
			RAFFLE_EVENTS.CREATE_FAILED,
			{ error_code: errorCode },
			{ userId },
		);

		return failure(errorCode);
	}
}
