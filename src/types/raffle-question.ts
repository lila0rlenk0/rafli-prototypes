import { z } from 'zod';

import { questionOptionSchema } from './question';

/**
 * Question that participants must answer before joining a raffle.
 *
 * Validation boundary: server-side — parsed from GET /raffles/:id/question response.
 */
export const raffleQuestionSchema = z.object({
	questionId: z.string(),
	text: z.string(),
	options: z.array(questionOptionSchema),
});

/** Response from POST /raffles/:id/answer — backend evaluates correctness. */
export const answerResponseSchema = z.object({
	correct: z.boolean(),
});

/** Check-in question attached to a specific raffle. */
export type RaffleQuestion = z.infer<typeof raffleQuestionSchema>;
/** Result of answering a raffle's check-in question. */
export type AnswerResponse = z.infer<typeof answerResponseSchema>;
