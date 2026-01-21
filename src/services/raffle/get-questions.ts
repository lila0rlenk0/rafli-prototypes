'use server';

import { authenticatedClient } from '@/lib/api/client';
import { failure, mapRaffleError, success } from '@/lib/errors';
import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import {
	type QuestionsResponse,
	questionsResponseSchema,
} from '@/types/question';
import type { ServiceResponse } from '@/types/service-response';
import { ZodError } from 'zod';

/**
 * Response type for fetching check-in questions
 */
type GetQuestionsResponse = ServiceResponse<QuestionsResponse, RaffleErrorCode>;

/**
 * Fetches available check-in questions from the backend
 *
 * @returns ServiceResponse with questions list on success, RaffleErrorCode on failure
 */
export async function getQuestions(): Promise<GetQuestionsResponse> {
	try {
		const response = await authenticatedClient.get('/questions');

		// Validate response data structure
		const validatedData = questionsResponseSchema.parse(response.data);

		return success(validatedData);
	} catch (error) {
		// Handle validation errors separately
		if (error instanceof ZodError) {
			console.error('Questions response validation failed:', error);
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapRaffleError(error);
		return failure(errorCode);
	}
}
