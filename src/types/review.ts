import { z } from 'zod';

// ==========================================
// Schemas
// ==========================================

/**
 * Schema for review entity from backend
 */
export const reviewSchema = z.object({
	id: z.string(),
	raffleId: z.string(),
	hostId: z.string(),
	rating: z.number().int().min(1).max(5),
	comment: z.string().nullable(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

/**
 * Schema for create review request payload
 */
export const createReviewPayloadSchema = z.object({
	raffleId: z.string(),
	hostId: z.string(),
	rating: z.number().int().min(1).max(5),
	comment: z.string().max(2_000).optional(),
});

/**
 * Schema for check review eligibility response
 */
export const checkReviewResponseSchema = z.object({
	canReview: z.boolean(),
	hasReviewed: z.boolean(),
	existingReview: reviewSchema.nullable().optional(),
});

// ==========================================
// Inferred Types
// ==========================================

export type Review = z.infer<typeof reviewSchema>;
export type CreateReviewPayload = z.infer<typeof createReviewPayloadSchema>;
export type CheckReviewResponse = z.infer<typeof checkReviewResponseSchema>;
