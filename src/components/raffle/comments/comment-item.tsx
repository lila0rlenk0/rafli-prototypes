'use client';

import { useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { MoreHorizontalIcon, TrashIcon } from 'lucide-react';

import type { Comment, VoteType } from '@/types/comment';

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatTimeAgo } from '@/lib/utils/format-time-ago';
import { useDeleteComment } from '@/services/comment/use-delete-comment';

import { CommentInput } from './comment-input';
import { CommentReplies } from './comment-replies';
import { CommentVoteButtons } from './comment-vote-buttons';

interface CommentItemProps {
	comment: Comment;
	raffleId: string;
	isAuthenticated: boolean;
	isOwner: boolean;
	currentUserId: string | null;
	/** When true, hides reply input + reply list — enforces single-level nesting */
	isReply?: boolean;
}

/**
 * Single comment display with avatar, body, voting, and reply controls
 *
 * Handles both top-level comments and replies. Deleted comments show
 * "[Deleted]" in italic gray instead of body text. Delete dropdown
 * shown for comment author or raffle host.
 *
 * @param comment - The comment data
 * @param raffleId - The raffle ID
 * @param isAuthenticated - Whether user is logged in
 * @param isOwner - Whether user owns the raffle (can delete any comment)
 * @param currentUserId - Current user's ID for delete permission
 * @param isReply - Whether this is a reply (hides nested reply controls)
 */
export function CommentItem({
	comment,
	raffleId,
	isAuthenticated,
	isOwner,
	currentUserId,
	isReply = false,
}: CommentItemProps) {
	const [showReplyInput, setShowReplyInput] = useState(false);
	const deleteMutation = useDeleteComment();

	/** Whether the current user can delete this comment */
	function canDelete(): boolean {
		if (comment.isDeleted) return false;
		// Raffle host can delete any comment
		if (isOwner) return true;
		// Comment author can delete their own
		return currentUserId === comment.author.id;
	}

	/** Gets the author display name */
	function getAuthorName(): string {
		return comment.author.name ?? 'Anonymous';
	}

	/** Gets the first initial for avatar fallback */
	function getAuthorInitial(): string {
		const name = getAuthorName();
		return name.charAt(0).toUpperCase();
	}

	/** Toggles the reply input visibility */
	function handleToggleReply() {
		setShowReplyInput(prev => !prev);
	}

	/** Hides reply input after a successful reply */
	function handleReplySuccess() {
		setShowReplyInput(false);
	}

	/** Handles delete — uses Radix DropdownMenu (portal-based, no overflow clipping) */
	function handleDelete() {
		deleteMutation.mutate(comment.id, {
			onError(error) {
				toast.error(error.message ?? 'Failed to delete comment');
			},
		});
	}

	return (
		<div className="flex gap-3">
			{/* Avatar */}
			<div className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-xs font-semibold">
				{comment.author.avatar ? (
					<Image
						src={comment.author.avatar}
						alt={getAuthorName()}
						fill
						sizes="32px"
						className="object-cover"
					/>
				) : (
					getAuthorInitial()
				)}
			</div>

			{/* Content */}
			<div className="min-w-0 flex-1">
				{/* Header: name + host badge + time */}
				<div className="flex items-center gap-2">
					<span className="text-sm font-semibold">{getAuthorName()}</span>
					{comment.isHost && (
						<span className="rounded bg-[#DFFFED] px-1.5 py-0.5 text-[10px] font-medium text-black">
							Host
						</span>
					)}
					<span className="text-xs text-gray-400">
						{formatTimeAgo(comment.createdAt)}
					</span>
				</div>

				{/* Body — redacted if deleted */}
				{comment.isDeleted ? (
					<p className="mt-1 text-sm text-gray-400 italic">[Deleted]</p>
				) : (
					<p className="mt-1 text-sm break-words whitespace-pre-wrap text-[#7B7B7B]">
						{comment.body}
					</p>
				)}

				{/* Actions row: vote + reply + delete */}
				{!comment.isDeleted && (
					<div className="mt-2 flex items-center gap-3">
						<CommentVoteButtons
							commentId={comment.id}
							voteScore={comment.voteScore}
							userVote={comment.userVote as VoteType | null}
							isAuthenticated={isAuthenticated}
							raffleId={raffleId}
						/>

						{/* Reply button — only for top-level comments, authenticated users */}
						{!isReply && isAuthenticated && (
							<button
								type="button"
								onClick={handleToggleReply}
								className="text-xs font-medium text-gray-500 hover:text-gray-700"
							>
								Reply
							</button>
						)}

						{/* Actions dropdown — portal-based to avoid overflow clipping */}
						{canDelete() && (
							<DropdownMenu>
								<DropdownMenuTrigger className="rounded p-0.5 text-gray-400 outline-none hover:text-gray-600">
									<MoreHorizontalIcon className="size-4" />
								</DropdownMenuTrigger>
								<DropdownMenuContent align="start">
									<DropdownMenuItem
										onClick={handleDelete}
										disabled={deleteMutation.isPending}
										className="text-red-600 focus:bg-red-50 focus:text-red-600"
									>
										<TrashIcon className="size-3" />
										Delete comment
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						)}
					</div>
				)}

				{/* Reply input — shown on toggle for top-level comments */}
				{showReplyInput && !isReply && (
					<div className="mt-3">
						<CommentInput
							raffleId={raffleId}
							parentId={comment.id}
							autoFocus
							placeholder="Write a reply..."
							onSuccess={handleReplySuccess}
						/>
					</div>
				)}

				{/* Nested replies — only for top-level comments */}
				{!isReply && comment.replyCount > 0 && (
					<CommentReplies
						raffleId={raffleId}
						commentId={comment.id}
						replyCount={comment.replyCount}
						isAuthenticated={isAuthenticated}
						isOwner={isOwner}
						currentUserId={currentUserId}
					/>
				)}
			</div>
		</div>
	);
}
