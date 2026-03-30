'use server';

import { ZodError } from 'zod';

import { RAFFLE_EVENTS } from '@/lib/analytics/events';
import { trackServer } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { getSession } from '@/lib/auth/session';
import { failure, success } from '@/lib/errors';
import { mapRaffleError } from '@/lib/errors';
import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import {
	answerResponseSchema,
	type AnswerResponse,
} from '@/types/raffle-question';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Response type for submitting a raffle answer
 */
type SubmitRaffleAnswerResponse = ServiceResponse<
	AnswerResponse,
	RaffleErrorCode
>;

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
	const session = await getSession();
	const userId = session?.user?.id;

	try {
		const response = await authenticatedClient.post(
			`/raffles/${raffleId}/answer`,
			{ optionId },
		);

		const validated = answerResponseSchema.parse(response.data);

		// Fire-and-forget — don't block answer UX
		void trackServer(
			RAFFLE_EVENTS.QUESTION_ANSWERED,
			{
				raffle_id: raffleId,
				correct: validated.correct,
			},
			{ userId },
		);

		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('Answer response validation failed:', error);
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		return failure(mapRaffleError(error));
	}
}
