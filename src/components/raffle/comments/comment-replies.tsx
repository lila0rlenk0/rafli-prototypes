'use client';

import { useState } from 'react';

import type { Comment } from '@/types/comment';

import { useCommentReplies } from '@/services/comment/use-comment-replies';

import { CommentItem } from './comment-item';

interface CommentRepliesProps {
	raffleId: string;
	commentId: string;
	replyCount: number;
	isAuthenticated: boolean;
	isOwner: boolean;
	currentUserId: string | null;
}

/**
 * Reply list for a single comment with "View N replies" toggle
 *
 * Starts collapsed — fetching is deferred until user clicks the toggle.
 * Indented with ml-10 to align with parent comment body (past the avatar).
 * Renders CommentItem without nested replies — enforces single-level nesting.
 *
 * @param raffleId - The raffle ID
 * @param commentId - The parent comment ID
 * @param replyCount - Number of replies (from parent comment)
 * @param isAuthenticated - Whether user is logged in
 * @param isOwner - Whether user owns the raffle
 * @param currentUserId - Current user's ID for delete permission
 */
export function CommentReplies({
	raffleId,
	commentId,
	replyCount,
	isAuthenticated,
	isOwner,
	currentUserId,
}: CommentRepliesProps) {
	const [showReplies, setShowReplies] = useState(false);

	const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
		useCommentReplies({
			raffleId,
			commentId,
			isAuthenticated,
			enabled: showReplies,
		});

	/** Flattens all pages into a single reply array */
	function getAllReplies(): Comment[] {
		if (!data?.pages) return [];
		return data.pages.flatMap(page => page.items);
	}

	/** Toggle label text */
	function getToggleLabel(): string {
		if (showReplies) return 'Hide replies';
		if (replyCount === 1) return 'View 1 reply';
		return `View ${replyCount} replies`;
	}

	// Don't render anything if there are no replies
	if (replyCount === 0) return null;

	const replies = getAllReplies();

	return (
		<div className="mt-2 ml-10">
			{/* Toggle button */}
			<button
				type="button"
				onClick={function toggleReplies() {
					setShowReplies(prev => !prev);
				}}
				className="mb-2 text-xs font-medium text-[#7B7B7B] hover:text-black"
			>
				{getToggleLabel()}
			</button>

			{/* Reply list */}
			{showReplies ? (
				<div className="space-y-3">
					{isLoading ? (
						<p className="text-xs text-gray-400">Loading replies...</p>
					) : null}

					{replies.map(reply => (
						<CommentItem
							key={reply.id}
							comment={reply}
							raffleId={raffleId}
							isAuthenticated={isAuthenticated}
							isOwner={isOwner}
							currentUserId={currentUserId}
							isReply
						/>
					))}

					{/* Load more replies */}
					{hasNextPage ? (
						<button
							type="button"
							onClick={function loadMore() {
								fetchNextPage();
							}}
							disabled={isFetchingNextPage}
							className="text-xs font-medium text-gray-500 hover:text-gray-700"
						>
							{isFetchingNextPage ? 'Loading...' : 'Load more replies'}
						</button>
					) : null}
				</div>
			) : null}
		</div>
	);
}
