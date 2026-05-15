'use client';

import { useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { MoreHorizontalIcon, TrashIcon } from 'lucide-react';

import type { Comment, VoteType } from '@/types/comment';
import { REPORT_CONTENT_TYPE } from '@/types/report';

import { ReportMenuItem } from '@/components/report/menu-item';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatTimeAgo } from '@/lib/utils/format/format-time-ago';
import { useDeleteComment } from '@/services/comment/use-delete-comment';

import { CommentInput } from './input';
import { CommentReplies } from './replies';
import { CommentVoteButtons } from './vote-buttons';

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

	// Compute display values and permissions once per render
	const authorName = comment.author.name ?? 'Anonymous';
	const authorInitial = authorName.charAt(0).toUpperCase();

	/** Whether the current user can delete — host can delete any, author can delete own */
	const deletable =
		!comment.isDeleted && (isOwner || currentUserId === comment.author.id);

	/** Whether the current user can report — authenticated non-authors only */
	const reportable =
		!comment.isDeleted &&
		isAuthenticated &&
		currentUserId !== comment.author.id;

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
						alt={authorName}
						fill
						sizes="32px"
						className="object-cover"
					/>
				) : (
					authorInitial
				)}
			</div>

			{/* Content */}
			<div className="min-w-0 flex-1">
				{/* Header: name + host badge + time */}
				<div className="flex items-center gap-2">
					<span className="text-sm font-semibold">{authorName}</span>
					{comment.isHost ? (
						<span className="bg-mint-100 text-3xs rounded px-1.5 py-0.5 font-medium text-black">
							Host
						</span>
					) : null}
					<span className="text-xs text-gray-400">
						{formatTimeAgo(comment.createdAt)}
					</span>
				</div>

				{/* Body — redacted if deleted */}
				{comment.isDeleted ? (
					<p className="mt-1 text-sm text-gray-400 italic">[Deleted]</p>
				) : (
					<p className="text-ink-500 mt-1 text-sm break-words whitespace-pre-wrap">
						{comment.body}
					</p>
				)}

				{/* Actions row: vote + reply + delete */}
				{!comment.isDeleted ? (
					<CommentActionRow
						comment={comment}
						raffleId={raffleId}
						isAuthenticated={isAuthenticated}
						isReply={isReply}
						deletable={deletable}
						reportable={reportable}
						isDeletePending={deleteMutation.isPending}
						onToggleReply={handleToggleReply}
						onDelete={handleDelete}
					/>
				) : null}

				{/* Reply input — shown on toggle for top-level comments */}
				{showReplyInput && !isReply ? (
					<div className="mt-3">
						<CommentInput
							raffleId={raffleId}
							parentId={comment.id}
							autoFocus
							placeholder="Write a reply..."
							onSuccess={handleReplySuccess}
						/>
					</div>
				) : null}

				{/* Nested replies — only for top-level comments */}
				{!isReply && comment.replyCount > 0 ? (
					<CommentReplies
						raffleId={raffleId}
						commentId={comment.id}
						replyCount={comment.replyCount}
						previewReplies={comment.previewReplies ?? []}
						isAuthenticated={isAuthenticated}
						isOwner={isOwner}
						currentUserId={currentUserId}
					/>
				) : null}
			</div>
		</div>
	);
}

interface CommentActionRowProps {
	comment: Comment;
	raffleId: string;
	isAuthenticated: boolean;
	isReply: boolean;
	deletable: boolean;
	reportable: boolean;
	isDeletePending: boolean;
	onToggleReply: () => void;
	onDelete: () => void;
}

/**
 * Action strip under a comment body — vote widget + reply toggle +
 * moderation dropdown. Extracted so `CommentItem` stays inside the 20-
 * point cyclomatic budget (the strip alone carries the majority of the
 * component's conditionals).
 */
function CommentActionRow({
	comment,
	raffleId,
	isAuthenticated,
	isReply,
	deletable,
	reportable,
	isDeletePending,
	onToggleReply,
	onDelete,
}: CommentActionRowProps) {
	const canReply = !isReply && isAuthenticated;
	const showActionsMenu = deletable || reportable;
	return (
		<div className="mt-2 flex items-center gap-3">
			<CommentVoteButtons
				commentId={comment.id}
				voteScore={comment.voteScore}
				userVote={comment.userVote as VoteType | null}
				isAuthenticated={isAuthenticated}
				raffleId={raffleId}
			/>
			{/* Reply button — only for top-level comments, authenticated users */}
			{canReply ? (
				<button
					type="button"
					onClick={onToggleReply}
					className="text-xs font-medium text-gray-500 hover:text-gray-700"
				>
					Reply
				</button>
			) : null}
			{/* Actions dropdown — portal-based to avoid overflow clipping */}
			{showActionsMenu ? (
				<DropdownMenu>
					<DropdownMenuTrigger className="rounded p-0.5 text-gray-400 outline-none hover:text-gray-600">
						<MoreHorizontalIcon className="size-4" />
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start">
						{deletable ? (
							<DropdownMenuItem
								onClick={onDelete}
								disabled={isDeletePending}
								className="text-red-600 focus:bg-red-50 focus:text-red-600"
							>
								<TrashIcon className="size-3" />
								Delete comment
							</DropdownMenuItem>
						) : null}
						{deletable && reportable ? <DropdownMenuSeparator /> : null}
						{reportable ? (
							<ReportMenuItem
								contentType={REPORT_CONTENT_TYPE.COMMENT}
								contentId={comment.id}
								raffleId={raffleId}
							/>
						) : null}
					</DropdownMenuContent>
				</DropdownMenu>
			) : null}
		</div>
	);
}
