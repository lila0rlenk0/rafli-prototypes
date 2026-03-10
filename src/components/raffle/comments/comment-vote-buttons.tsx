'use client';

import { VOTE_TYPE, type VoteType } from '@/types/comment';

import { cn } from '@/lib/utils';
import { useVoteComment } from '@/services/comment/use-vote-comment';

interface CommentVoteButtonsProps {
	commentId: string;
	voteScore: number;
	userVote: VoteType | null;
	isAuthenticated: boolean;
	raffleId: string;
}

/**
 * Upvote/downvote buttons for a comment
 *
 * Displays arrows with score between them. Active vote is highlighted.
 * Disabled (visually present but non-interactive) for unauthenticated users.
 * Uses optimistic mutation for instant feedback.
 *
 * @param commentId - The comment to vote on
 * @param voteScore - Current net score
 * @param userVote - Current user's vote direction (null if none)
 * @param isAuthenticated - Whether the user is logged in
 * @param raffleId - The raffle ID (needed for cache invalidation)
 */
export function CommentVoteButtons({
	commentId,
	voteScore,
	userVote,
	isAuthenticated,
	raffleId,
}: CommentVoteButtonsProps) {
	const voteMutation = useVoteComment();

	/** Handles vote click — toggles vote on/off */
	function handleVote(type: VoteType) {
		if (!isAuthenticated) return;
		voteMutation.mutate({ commentId, type, raffleId });
	}

	/** Whether upvote arrow should be highlighted */
	function isUpvoteActive(): boolean {
		return userVote === VOTE_TYPE.UPVOTE;
	}

	/** Whether downvote arrow should be highlighted */
	function isDownvoteActive(): boolean {
		return userVote === VOTE_TYPE.DOWNVOTE;
	}

	return (
		<div className="flex items-center gap-1">
			<button
				type="button"
				onClick={function onUpvote() {
					handleVote(VOTE_TYPE.UPVOTE);
				}}
				disabled={!isAuthenticated}
				className={cn(
					'rounded p-0.5 text-sm transition-colors',
					isUpvoteActive()
						? 'text-green-600'
						: 'text-gray-400 hover:text-gray-600',
					!isAuthenticated && 'cursor-default opacity-50',
				)}
				aria-label="Upvote"
			>
				▲
			</button>

			<span className="min-w-[1.5rem] text-center text-xs font-medium text-[#7B7B7B]">
				{voteScore}
			</span>

			<button
				type="button"
				onClick={function onDownvote() {
					handleVote(VOTE_TYPE.DOWNVOTE);
				}}
				disabled={!isAuthenticated}
				className={cn(
					'rounded p-0.5 text-sm transition-colors',
					isDownvoteActive()
						? 'text-red-500'
						: 'text-gray-400 hover:text-gray-600',
					!isAuthenticated && 'cursor-default opacity-50',
				)}
				aria-label="Downvote"
			>
				▼
			</button>
		</div>
	);
}
