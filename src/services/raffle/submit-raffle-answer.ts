'use server';

import { authenticatedClient } from '@/lib/api/client';
import { failure, success } from '@/lib/errors';
import { mapRaffleError } from '@/lib/errors';
import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import {
	answerResponseSchema,
	type AnswerResponse,
} from '@/types/raffle-question';
import type { ServiceResponse } from '@/types/service-response';
import { ZodError } from 'zod';

/**
 * Response type for submitting a raffle answer
 */
type SubmitRaffleAnswerResponse = ServiceResponse<AnswerResponse, RaffleErrorCode>;

/**
 * Submits an answer to a raffle question
 * Users must have at least one correct answer before creating an order
 *
 * @param raffleId - The UUID of the raffle
 * @param optionId - The UUID of the selected answer option
 * @returns ServiceResponse with answer result or error code
 */
export async function submitRaffleAnswer(
	raffleId: string,
	optionId: string,
): Promise<SubmitRaffleAnswerResponse> {
	try {
		const response = await authenticatedClient.post(
			`/raffles/${raffleId}/answer`,
			{ optionId },
		);

		const validated = answerResponseSchema.parse(response.data);

		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('Answer response validation failed:', error);
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		return failure(mapRaffleError(error));
	}
}
