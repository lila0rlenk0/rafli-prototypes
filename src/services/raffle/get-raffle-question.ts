'use server';

import { authenticatedClient } from '@/lib/api/client';
import { pathParam } from '@/lib/utils/routing/path-param';
import { failure, mapRaffleError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import {
	raffleQuestionSchema,
	type RaffleQuestion,
} from '@/types/raffle-question';
import type { ServiceResponse } from '@/types/service-response';
import { ZodError } from 'zod';

/**
 * Fetches the question for a raffle.
 * Users must answer this question correctly before purchasing tickets.
 *
 * @param raffleId - The UUID of the raffle
 * @returns ServiceResponse with question data or error code
 */
export async function getRaffleQuestion(
	raffleId: string,
): Promise<ServiceResponse<RaffleQuestion, RaffleErrorCode>> {
	try {
		const response = await authenticatedClient.get(
			`/raffles/${pathParam(raffleId)}/question`,
		);
		return success(raffleQuestionSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'raffle', 'get-raffle-question');
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		return failure(mapRaffleError(error));
	}
}
