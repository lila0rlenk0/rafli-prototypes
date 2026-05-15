import { z } from 'zod';

import { paginationMetadataSchema } from './pagination';

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

export type CommentSort = (typeof COMMENT_SORT)[keyof typeof COMMENT_SORT];
export type VoteType = (typeof VOTE_TYPE)[keyof typeof VOTE_TYPE];

export const commentAuthorSchema = z.object({
	id: z.string(),
	name: z.string().nullable(),
	avatar: z.string().nullable(),
});

/**
 * Comment entity — supports threaded replies via `parentId`.
 *
 * Validation boundary: server-side — parsed in comment-fetching server actions.
 * `userVote` is null for unauthenticated requests (public endpoint).
 *
 * Defined in two layers because `previewReplies` references the same shape as
 * the parent — recursive z.object would self-reference at definition time.
 * Single-level nesting is enforced by the backend: replies inside
 * `previewReplies` never carry their own `previewReplies` field, so the inner
 * type can drop it and we keep schemas non-recursive.
 */
const commentBaseShape = {
	id: z.string(),
	author: commentAuthorSchema,
	// Nullable: backend returns `null` for soft-deleted comments (see `isDeleted`).
	// Consumers must guard with `isDeleted` before rendering — see `comments/item.tsx`.
	body: z.string().nullable(),
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
};

const commentReplySchema = z.object(commentBaseShape);

export const commentSchema = z.object({
	...commentBaseShape,
	// Earliest non-deleted reply preloaded by the backend so the UI can render
	// the first reply without a follow-up request to the replies endpoint.
	// Optional — omitted when the parent has no live replies.
	previewReplies: z.array(commentReplySchema).optional(),
});

/** Page-based pagination (not offset-based like updates) */
export const listCommentsResponseSchema = paginationMetadataSchema.extend({
	items: z.array(commentSchema),
});

export const voteResponseSchema = z.object({
	commentId: z.string(),
	voteScore: z.number(),
	/** Backend returns `voteType` (null when toggled off) */
	voteType: z.enum([VOTE_TYPE.UPVOTE, VOTE_TYPE.DOWNVOTE]).nullable(),
});

/** Soft-delete — comment body replaced with "[Deleted]" */
export const deleteCommentResponseSchema = z.object({
	success: z.literal(true),
});

/**
 * Validation boundary: client-side — validated in the comment form.
 * `COMMENT_BODY_MAX` is shared with backend to ensure consistent limits.
 */
export const createCommentPayloadSchema = z.object({
	body: z.string().min(1).max(COMMENT_BODY_MAX),
});

export type CommentAuthor = z.infer<typeof commentAuthorSchema>;
export type Comment = z.infer<typeof commentSchema>;
export type ListCommentsResponse = z.infer<typeof listCommentsResponseSchema>;
export type VoteResponse = z.infer<typeof voteResponseSchema>;
export type DeleteCommentResponse = z.infer<typeof deleteCommentResponseSchema>;
export type CreateCommentPayload = z.infer<typeof createCommentPayloadSchema>;
