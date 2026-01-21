import { z } from 'zod';

// ==========================================
// Schemas
// ==========================================

/**
 * Schema for question option
 * Represents a single answer option for a check-in question
 */
export const questionOptionSchema = z.object({
	id: z.string(),
	text: z.string(),
	sortOrder: z.number(),
});

/**
 * Schema for check-in question
 * Represents a question that participants answer before joining a raffle
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

/**
 * Schema for questions response from the backend
 * Returns a list of questions with pagination total
 */
export const questionsResponseSchema = z.object({
	questions: z.array(questionSchema),
	total: z.number(),
});

// ==========================================
// Inferred Types
// ==========================================

export type QuestionOption = z.infer<typeof questionOptionSchema>;
export type Question = z.infer<typeof questionSchema>;
export type QuestionsResponse = z.infer<typeof questionsResponseSchema>;
