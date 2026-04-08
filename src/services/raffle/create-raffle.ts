'use server';

import { ZodError } from 'zod';

import { RAFFLE_EVENTS } from '@/lib/analytics/events';
import { trackServer } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/config';
import { getSession } from '@/lib/auth/session';
import { failure, mapRaffleError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
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
		const payload = {
			title: input.title,
			description: input.description,
			declaredValueAmount: input.price.toString(),
			declaredValueCurrency: 'USD',
			categoryId: input.category,
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
			// Crypto config — backend ignores these when acceptsCrypto is false
			acceptsCrypto: input.acceptsCrypto,
			cryptoChainIds: input.cryptoChainIds,
			cryptoTokens: input.cryptoTokens,
			cryptoTokenPricing: input.cryptoTokenPricing,
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
			captureContractDrift(error, 'raffle', 'create-raffle');
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
