'use client';

import { useState } from 'react';

import type { Comment } from '@/types/comment';

import { useCommentReplies } from '@/services/comment/use-comment-replies';

import { CommentItem } from './item';

interface CommentRepliesProps {
	raffleId: string;
	commentId: string;
	replyCount: number;
	/**
	 * Earliest non-deleted reply, preloaded by the comments list endpoint.
	 * Empty array when the parent has no live replies (this component isn't
	 * rendered in that case anyway). Render eagerly so the first reply is
	 * always visible without a follow-up request.
	 */
	previewReplies: Comment[];
	isAuthenticated: boolean;
	isOwner: boolean;
	currentUserId: string | null;
}

/**
 * Reply list with first-reply preview + on-demand expansion
 *
 * Backend pre-loads the earliest reply via `previewReplies` on every top-level
 * comment, so the first reply renders for free — no per-comment fetch fan-out.
 * The remaining replies stay collapsed behind a "View N more replies" toggle
 * and are fetched lazily through `useCommentReplies` only when the user opts in.
 *
 * Indented with ml-10 to align with parent comment body (past the avatar).
 * Renders CommentItem with `isReply` to enforce single-level nesting.
 *
 * @param raffleId - The raffle ID
 * @param commentId - The parent comment ID
 * @param replyCount - Total number of live replies (authoritative for the toggle label)
 * @param previewReplies - Preloaded earliest reply (0 or 1 items)
 * @param isAuthenticated - Whether user is logged in
 * @param isOwner - Whether user owns the raffle
 * @param currentUserId - Current user's ID for delete permission
 */
export function CommentReplies({
	raffleId,
	commentId,
	replyCount,
	previewReplies,
	isAuthenticated,
	isOwner,
	currentUserId,
}: CommentRepliesProps) {
	const [showAll, setShowAll] = useState(false);

	// Lazy fetch — only fires when the user expands the thread. Disabled by
	// default so the comments list page costs zero extra reply requests.
	const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
		useCommentReplies({
			raffleId,
			commentId,
			isAuthenticated,
			enabled: showAll,
		});

	const previewReply = previewReplies[0] ?? null;
	// replyCount is authoritative — it comes from the parent comment row and
	// reflects the true live-reply total even before pages have loaded.
	const remainingCount = replyCount - (previewReply ? 1 : 0);

	/** Flatten loaded pages and drop the preview reply to avoid double-rendering */
	function getExpandedReplies(): Comment[] {
		if (!data?.pages) return [];
		const all = data.pages.flatMap(page => page.items);
		if (!previewReply) return all;
		return all.filter(reply => reply.id !== previewReply.id);
	}

	/** Toggle label — uses authoritative replyCount, not loaded slice */
	function getToggleLabel(): string {
		if (showAll) return 'Hide replies';
		if (remainingCount === 1) return 'View 1 more reply';
		return `View ${remainingCount} more replies`;
	}

	const expandedReplies = getExpandedReplies();

	return (
		<div className="mt-2 ml-10">
			{/* First reply — always visible from preloaded prop */}
			{previewReply ? (
				<div className="mb-2">
					<CommentItem
						comment={previewReply}
						raffleId={raffleId}
						isAuthenticated={isAuthenticated}
						isOwner={isOwner}
						currentUserId={currentUserId}
						isReply
					/>
				</div>
			) : null}

			{/* Toggle — hidden when there's nothing more to expand */}
			{remainingCount > 0 ? (
				<button
					type="button"
					onClick={function toggleReplies() {
						setShowAll(prev => !prev);
					}}
					className="text-ink-500 mb-2 text-xs font-medium hover:text-black"
				>
					{getToggleLabel()}
				</button>
			) : null}

			{/* Remaining replies — fetched lazily on first expand */}
			{showAll ? (
				<div className="flex flex-col gap-3">
					{isLoading ? (
						<p className="text-xs text-gray-400">Loading replies...</p>
					) : null}

					{expandedReplies.map(reply => (
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

					{/* Load more replies — paginates the rest of the thread */}
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
