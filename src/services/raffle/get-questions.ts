'use server';

import { authenticatedClient } from '@/lib/api/client';
import { failure, mapRaffleError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import {
	type QuestionsResponse,
	questionsResponseSchema,
} from '@/types/question';
import type { ServiceResponse } from '@/types/service-response';
import { ZodError } from 'zod';

/**
 * Fetches available check-in questions from the backend
 *
 * @returns ServiceResponse with questions list on success, RaffleErrorCode on failure
 */
export async function getQuestions(): Promise<
	ServiceResponse<QuestionsResponse, RaffleErrorCode>
> {
	try {
		const response = await authenticatedClient.get('/questions');
		return success(questionsResponseSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'raffle', 'get-questions');
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		return failure(mapRaffleError(error));
	}
}
