import { z } from 'zod';

/**
 * Host review left by a raffle winner.
 *
 * Validation boundary: server-side — parsed in review server actions.
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
 * Payload for POST /reviews — winner submits a host review.
 *
 * Validation boundary: client-side — validated in the review form before server action.
 */
export const createReviewPayloadSchema = z.object({
	raffleId: z.string(),
	hostId: z.string(),
	rating: z.number().int().min(1).max(5),
	comment: z.string().max(2_000).optional(),
});

/** Response from GET /reviews/check — eligibility + existing review lookup. */
export const checkReviewResponseSchema = z.object({
	canReview: z.boolean(),
	hasReviewed: z.boolean(),
	existingReview: reviewSchema.nullable().optional(),
});

/** Host review entity. */
export type Review = z.infer<typeof reviewSchema>;
/** Payload for creating a host review. */
export type CreateReviewPayload = z.infer<typeof createReviewPayloadSchema>;
/** Review eligibility check response. */
export type CheckReviewResponse = z.infer<typeof checkReviewResponseSchema>;
