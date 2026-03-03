'use client';

import { useState } from 'react';
import { toast } from 'sonner';

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
 * Textarea + submit button for composing comments or replies
 *
 * Uses the unified useCreateComment mutation which routes to the
 * correct endpoint based on parentId presence.
 * Clears input and calls onSuccess on successful submit.
 *
 * @param raffleId - The raffle ID
 * @param parentId - Optional parent comment ID for replies
 * @param onSuccess - Optional callback after successful creation
 * @param autoFocus - Whether to auto-focus the textarea
 * @param placeholder - Custom placeholder text
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

	/** Whether the submit button should be disabled */
	function isSubmitDisabled(): boolean {
		return body.trim().length === 0 || createMutation.isPending;
	}

	/** Handles form submission */
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

	/** Handles Enter key — submit on Enter, newline on Shift+Enter */
	function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSubmit();
		}
	}

	return (
		<div className="flex flex-col gap-2">
			<textarea
				value={body}
				onChange={function onInput(e) {
					setBody(e.target.value);
				}}
				onKeyDown={handleKeyDown}
				placeholder={placeholder}
				maxLength={COMMENT_BODY_MAX}
				autoFocus={autoFocus}
				rows={2}
				className="w-full resize-none rounded-lg border border-[#E5E5E5] bg-gray-50 px-3 py-2 text-sm transition-colors outline-none placeholder:text-[#B4B4B4] focus:border-black focus:bg-white"
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
