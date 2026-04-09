import { z } from 'zod';

/** Single answer option within a check-in question. */
export const questionOptionSchema = z.object({
	id: z.string(),
	text: z.string(),
	sortOrder: z.number(),
});

/**
 * Check-in question that participants answer before joining a raffle.
 *
 * Validation boundary: server-side — parsed from GET /questions response.
 */
export const questionSchema = z.object({
	id: z.string(),
	categoryId: z.string(),
	text: z.string(),
	isActive: z.boolean(),
	sortOrder: z.number(),
	options: z.array(questionOptionSchema),
	createdAt: z.string(),
	updatedAt: z.string(),
});

/** Response from GET /questions — list of available check-in questions for a category. */
export const questionsResponseSchema = z.object({
	questions: z.array(questionSchema),
	total: z.number(),
});

/** Single answer option within a check-in question. */
export type QuestionOption = z.infer<typeof questionOptionSchema>;
/** Check-in question with its answer options. */
export type Question = z.infer<typeof questionSchema>;
/** Response from the questions listing endpoint. */
export type QuestionsResponse = z.infer<typeof questionsResponseSchema>;
