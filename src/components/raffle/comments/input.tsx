'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { Textarea } from '@/components/ui/textarea';
import { COMMENT_BODY_MAX } from '@/types/comment';

import { useCreateComment } from '@/services/comment/use-create-comment';

interface CommentInputProps {
	raffleId: string;
	/** When set, creates a reply instead of a top-level comment */
	parentId?: string;
	/** Called after successful submit — used to close reply input */
	onSuccess?: () => void;
	autoFocus?: boolean;
	placeholder?: string;
}

/**
 * Textarea + submit for comments/replies.
 * Routes to reply endpoint when parentId is set (via useCreateComment).
 */
export function CommentInput({
	raffleId,
	parentId,
	onSuccess,
	autoFocus = false,
	placeholder = 'Write a comment...',
}: CommentInputProps) {
	const [body, setBody] = useState('');
	const createMutation = useCreateComment();

	function isSubmitDisabled(): boolean {
		return body.trim().length === 0 || createMutation.isPending;
	}

	function handleSubmit() {
		const trimmed = body.trim();
		if (trimmed.length === 0) return;

		createMutation.mutate(
			{ raffleId, payload: { body: trimmed }, parentId },
			{
				onSuccess() {
					setBody('');
					onSuccess?.();
				},
				onError(error) {
					toast.error(error.message ?? 'Failed to post comment');
				},
			},
		);
	}

	// Enter=submit, Shift+Enter=newline
	function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSubmit();
		}
	}

	return (
		<div className="flex flex-col gap-2">
			<Textarea
				value={body}
				onChange={function onInput(e) {
					setBody(e.target.value);
				}}
				onKeyDown={handleKeyDown}
				placeholder={placeholder}
				maxLength={COMMENT_BODY_MAX}
				autoFocus={autoFocus}
				rows={2}
				className="placeholder:text-ink-300 resize-none bg-gray-50 text-sm focus:bg-white"
			/>
			<div className="flex items-center justify-between">
				<span className="text-xs text-gray-400">
					{body.length}/{COMMENT_BODY_MAX}
				</span>
				<button
					type="button"
					onClick={handleSubmit}
					disabled={isSubmitDisabled()}
					className="rounded-full bg-black px-4 py-1.5 text-xs font-medium text-white transition-opacity disabled:opacity-40"
				>
					{createMutation.isPending ? 'Posting...' : 'Post'}
				</button>
			</div>
		</div>
	);
}
