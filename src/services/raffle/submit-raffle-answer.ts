'use server';

import { ZodError } from 'zod';

import { RAFFLE_EVENTS } from '@/lib/analytics/events';
import { trackAfter } from '@/lib/analytics/mixpanel-server';
import { authenticatedClient } from '@/lib/api/client';
import { pathParam } from '@/lib/utils/routing/path-param';
import { getSession } from '@/lib/auth/session';
import { failure, mapRaffleError, success } from '@/lib/errors';
import { captureContractDrift } from '@/lib/sentry/capture';
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
	const sessionPromise = Promise.resolve(getSession());

	try {
		const response = await authenticatedClient.post(
			`/raffles/${pathParam(raffleId)}/answer`,
			{ optionId },
		);

		const validated = answerResponseSchema.parse(response.data);

		// Must `await` trackAfter — it resolves IP via headers() in request
		// scope then defers Mixpanel via after(). `void trackAfter(...)` would
		// run headers() post-response and throw.
		const session = await sessionPromise;
		await trackAfter(
			RAFFLE_EVENTS.QUESTION_ANSWERED,
			{
				raffle_id: raffleId,
				correct: validated.correct,
			},
			{ userId: session?.user?.id },
		);

		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'raffle', 'submit-raffle-answer');
			return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
		}

		return failure(mapRaffleError(error));
	}
}
