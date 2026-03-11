'use client';

import {
	type InfiniteData,
	useMutation,
	useQueryClient,
} from '@tanstack/react-query';

import { toast } from 'sonner';

import { getVoteErrorMessage } from '@/lib/comment/error-messages';
import { serviceError, type ServiceError } from '@/lib/query/errors';
import type {
	ListCommentsResponse,
	VoteResponse,
	VoteType,
} from '@/types/comment';
import type { CommentErrorCode } from '@/types/errors';

import { voteComment } from './vote-comment';

/** Mutation variables for voting */
interface VoteCommentVariables {
	commentId: string;
	type: VoteType;
	raffleId: string;
}

/**
 * Calculates the new vote score after a vote toggle
 *
 * Backend toggles votes: voting the same direction twice removes the vote.
 * We need to predict the new score for optimistic updates.
 *
 * @param currentScore - Current vote score
 * @param currentVote - Current user vote (null if none)
 * @param newVoteType - The vote being cast
 * @returns Predicted new score
 */
function predictVoteScore(
	currentScore: number,
	currentVote: 'upvote' | 'downvote' | null,
	newVoteType: VoteType,
): number {
	// Step 1: Remove existing vote effect (if any)
	let score = currentScore;
	if (currentVote === 'upvote') score -= 1;
	if (currentVote === 'downvote') score += 1;

	// Step 2: Apply new vote (unless toggling off — same direction)
	if (currentVote !== newVoteType) {
		if (newVoteType === 'upvote') score += 1;
		if (newVoteType === 'downvote') score -= 1;
	}

	return score;
}

/**
 * Predicts the new userVote after a toggle
 *
 * Same direction = remove vote (null), different direction = apply new vote.
 */
function predictUserVote(
	currentVote: 'upvote' | 'downvote' | null,
	newVoteType: VoteType,
): 'upvote' | 'downvote' | null {
	return currentVote === newVoteType ? null : newVoteType;
}

/** Type alias for the infinite query data shape */
type InfiniteCommentsData = InfiniteData<ListCommentsResponse, number>;

/**
 * Mutation hook for voting on a comment with optimistic updates
 *
 * Immediately updates the vote score and userVote in the infinite query cache
 * for instant UI feedback. Rolls back on error via saved snapshot.
 *
 * @returns React Query mutation result
 */
export function useVoteComment() {
	const queryClient = useQueryClient();

	return useMutation<
		VoteResponse,
		ServiceError<CommentErrorCode>,
		VoteCommentVariables,
		{ previousData: Map<string, InfiniteCommentsData | undefined> }
	>({
		mutationFn: async function vote(variables) {
			const result = await voteComment(variables.commentId, variables.type);
			if (!result.success) throw serviceError(result.error);
			return result.data;
		},
		onMutate: async function optimisticUpdate(variables) {
			// Step 1: Cancel in-flight queries to prevent overwriting our optimistic update
			await queryClient.cancelQueries({ queryKey: ['comment'] });

			// Step 2: Snapshot all comment query caches for rollback
			const queryCache = queryClient.getQueryCache();
			const commentQueries = queryCache.findAll({
				queryKey: ['comment'],
			});

			const previousData = new Map<string, InfiniteCommentsData | undefined>();

			// Step 3: Optimistically update every matching infinite query
			//         Comment could be in top-level list or any reply list
			for (const query of commentQueries) {
				const key = JSON.stringify(query.queryKey);
				const data = query.state.data as InfiniteCommentsData | undefined;
				previousData.set(key, data);

				if (!data?.pages) continue;

				queryClient.setQueryData<InfiniteCommentsData>(query.queryKey, {
					...data,
					pages: data.pages.map(page => ({
						...page,
						items: page.items.map(comment => {
							if (comment.id !== variables.commentId) return comment;

							return {
								...comment,
								voteScore: predictVoteScore(
									comment.voteScore,
									comment.userVote,
									variables.type,
								),
								userVote: predictUserVote(comment.userVote, variables.type),
							};
						}),
					})),
				});
			}

			return { previousData };
		},
		onError(error, _variables, context) {
			// Step 4: Rollback — restore all cached data from snapshot + notify user
			toast.error(getVoteErrorMessage(error.code));

			if (!context?.previousData) return;

			// Iterate snapshot entries directly — ensures every snapshotted query
			// is restored even if the query was unmounted between onMutate and onError
			for (const [key, previous] of context.previousData.entries()) {
				if (previous !== undefined) {
					queryClient.setQueryData(JSON.parse(key), previous);
				}
			}
		},
		onSuccess(serverData, variables) {
			// Step 5: Apply server-authoritative vote state to cache
			//         Don't use invalidateQueries — it refetches and can race with
			//         backend commit timing, causing the optimistic update to revert.
			//         Instead, patch the cache directly with the server response.
			const queryCache = queryClient.getQueryCache();
			const commentQueries = queryCache.findAll({
				queryKey: ['comment'],
			});

			for (const query of commentQueries) {
				const data = query.state.data as InfiniteCommentsData | undefined;
				if (!data?.pages) continue;

				queryClient.setQueryData<InfiniteCommentsData>(query.queryKey, {
					...data,
					pages: data.pages.map(page => ({
						...page,
						items: page.items.map(comment => {
							if (comment.id !== variables.commentId) return comment;
							return {
								...comment,
								voteScore: serverData.voteScore,
								userVote: serverData.voteType,
							};
						}),
					})),
				});
			}
		},
	});
}
