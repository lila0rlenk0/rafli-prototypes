import { z } from 'zod';

import { questionOptionSchema } from './question';

// ==========================================
// Schemas
// ==========================================

/**
 * Schema for raffle question response
 * Represents the question that participants must answer before joining a raffle
 */
export const raffleQuestionSchema = z.object({
	questionId: z.string(),
	text: z.string(),
	options: z.array(questionOptionSchema),
});

/**
 * Schema for answer response from the backend
 * Indicates whether the submitted answer was correct
 */
export const answerResponseSchema = z.object({
	correct: z.boolean(),
});

// ==========================================
// Inferred Types
// ==========================================

export type RaffleQuestion = z.infer<typeof raffleQuestionSchema>;
export type AnswerResponse = z.infer<typeof answerResponseSchema>;
