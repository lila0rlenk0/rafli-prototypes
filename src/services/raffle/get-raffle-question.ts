'use server';

import { authenticatedClient } from '@/lib/api/client';
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
 * Response type for fetching a raffle question
 */
type GetRaffleQuestionResponse = ServiceResponse<
	RaffleQuestion,
	RaffleErrorCode
>;

/**
 * Fetches the question for a raffle
 * Users must answer this question correctly before purchasing tickets
 *
 * @param raffleId - The UUID of the raffle
 * @returns ServiceResponse with question data or error code
 */
export async function getRaffleQuestion(
	raffleId: string,
): Promise<GetRaffleQuestionResponse> {
	try {
		const response = await authenticatedClient.get(
			`/raffles/${raffleId}/question`,
		);

		const validated = raffleQuestionSchema.parse(response.data);

		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'raffle', 'get-raffle-question');
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		return failure(mapRaffleError(error));
	}
}
