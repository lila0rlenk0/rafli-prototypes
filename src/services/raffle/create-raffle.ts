'use server';

import { runAfter } from '@/lib/utils/run-after';
import { ZodError } from 'zod';

import { RAFFLE_EVENTS } from '@/lib/analytics/events';
import { trackServer } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { API_TIMEOUTS } from '@/lib/api/constants';
import { getSession } from '@/lib/auth/session';
import { failure, mapRaffleError, success } from '@/lib/errors';
import {
	captureContractDrift,
	captureServiceError,
} from '@/lib/sentry/capture';
import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import type { CreateRaffleInput, Raffle } from '@/types/raffle';
import { createRafflePayloadSchema, raffleSchema } from '@/types/raffle';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Creates a new raffle
 *
 * @param input - Raffle creation data
 * @returns ServiceResponse with created raffle on success, RaffleErrorCode on failure
 */
export async function createRaffle(
	input: CreateRaffleInput,
): Promise<ServiceResponse<Raffle, RaffleErrorCode>> {
	const sessionPromise = Promise.resolve(getSession());

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

		const validationResult = createRafflePayloadSchema.safeParse(payload);
		if (!validationResult.success) {
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		const response = await authenticatedClient.post(
			'/raffles',
			validationResult.data,
			{ timeout: API_TIMEOUTS.MUTATION },
		);

		const raffle = raffleSchema.parse(response.data);

		runAfter(async () => {
			const userId = (await sessionPromise)?.user?.id;

			await trackServer(
				RAFFLE_EVENTS.CREATED,
				{
					raffle_id: raffle.id,
					category: input.category,
					ticket_price: input.pricePerTicket,
					max_participants: input.maxParticipants,
					min_participants: input.minParticipants,
					number_of_winners: input.numberOfWinners,
					accepts_crypto: input.acceptsCrypto,
					has_question: !!input.checkInQuestion,
				},
				{ userId },
			);
		});

		return success(raffle);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'raffle', 'create-raffle');
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		// Map and capture — host raffle creation is a critical mutation (gates
		// all downstream ticket sales and prize flows), match payment-level
		// instrumentation so drafts lost to backend errors surface in Sentry.
		const errorCode = mapRaffleError(error);
		captureServiceError(error, errorCode, {
			service: 'raffle',
			action: 'create-raffle',
		});

		runAfter(async () => {
			const userId = (await sessionPromise)?.user?.id;

			await trackServer(
				RAFFLE_EVENTS.CREATE_FAILED,
				{ error_code: errorCode },
				{ userId },
			);
		});

		return failure(errorCode);
	}
}
