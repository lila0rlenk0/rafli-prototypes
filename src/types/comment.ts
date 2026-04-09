import { z } from 'zod';

import { paginationMetadataSchema } from './pagination';

// ==========================================
// Constants
// ==========================================

/** Sort options for comment listing */
export const COMMENT_SORT = {
	NEWEST: 'newest',
	OLDEST: 'oldest',
	TOP: 'top',
} as const;

/** Vote direction for comment voting */
export const VOTE_TYPE = {
	UPVOTE: 'upvote',
	DOWNVOTE: 'downvote',
} as const;

/** Max comment body length — must match backend BODY_MAX */
export const COMMENT_BODY_MAX = 2_000;

// ==========================================
// Types from Constants
// ==========================================

export type CommentSort = (typeof COMMENT_SORT)[keyof typeof COMMENT_SORT];
export type VoteType = (typeof VOTE_TYPE)[keyof typeof VOTE_TYPE];

// ==========================================
// Schemas
// ==========================================

/**
 * Schema for comment author — embedded user data in comment responses
 */
export const commentAuthorSchema = z.object({
	id: z.string(),
	name: z.string().nullable(),
	avatar: z.string().nullable(),
});

/**
 * Schema for a single comment
 * Represents a top-level comment or reply on a raffle
 */
export const commentSchema = z.object({
	id: z.string(),
	author: commentAuthorSchema,
	body: z.string(),
	parentId: z.string().nullable(),
	raffleId: z.string(),
	isHost: z.boolean(),
	isDeleted: z.boolean(),
	voteScore: z.number(),
	/** null when fetched via public endpoint (no auth), 'upvote'|'downvote' when authenticated */
	userVote: z.enum([VOTE_TYPE.UPVOTE, VOTE_TYPE.DOWNVOTE]).nullable(),
	replyCount: z.number(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

/**
 * Schema for paginated comment list response
 * Page-based pagination (not offset-based like updates)
 */
export const listCommentsResponseSchema = paginationMetadataSchema.extend({
	items: z.array(commentSchema),
});

/**
 * Schema for vote endpoint response
 * Returns updated vote state after toggle
 */
export const voteResponseSchema = z.object({
	commentId: z.string(),
	voteScore: z.number(),
	/** Backend returns `voteType` (null when toggled off) */
	voteType: z.enum([VOTE_TYPE.UPVOTE, VOTE_TYPE.DOWNVOTE]).nullable(),
});

/**
 * Schema for delete comment response
 * Soft-delete — comment body replaced with "[Deleted]"
 */
export const deleteCommentResponseSchema = z.object({
	success: z.literal(true),
});

/**
 * Schema for creating a comment
 * Payload sent to POST /raffles/:id/comments or /comments/:id/replies
 */
export const createCommentPayloadSchema = z.object({
	body: z.string().min(1).max(COMMENT_BODY_MAX),
});

// ==========================================
// Inferred Types
// ==========================================

export type CommentAuthor = z.infer<typeof commentAuthorSchema>;
export type Comment = z.infer<typeof commentSchema>;
export type ListCommentsResponse = z.infer<typeof listCommentsResponseSchema>;
export type VoteResponse = z.infer<typeof voteResponseSchema>;
export type DeleteCommentResponse = z.infer<typeof deleteCommentResponseSchema>;
export type CreateCommentPayload = z.infer<typeof createCommentPayloadSchema>;
