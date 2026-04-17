'use client';

import { Send } from 'lucide-react';
import { useRef, useState, type KeyboardEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

/** Max body length — matches backend `sendMessageDtoSchema` (min 1, max 4000). */
const MAX_BODY_LENGTH = 4_000;
/** Cadence for emitting `typing` WS events while the user is actively typing. */
const TYPING_THROTTLE_MS = 2_000;

interface MessageComposerProps {
	/** Sends the typed body. Must throw on rejection for the composer to stay disabled. */
	readonly onSend: (body: string) => void | Promise<void>;
	/** Emits a typing WS event — throttled internally so the provider stays cheap. */
	readonly onTyping?: () => void;
	/** True while an in-flight send is resolving — composer locks to avoid duplicates. */
	readonly disabled?: boolean;
	/** Shown as placeholder — varies by conversation type in the caller. */
	readonly placeholder?: string;
}

/**
 * Text input for sending messages. Enter sends, Shift+Enter inserts a
 * newline. Locally enforces the backend body length so callers don't
 * have to disable the Send button themselves.
 *
 * Typing events are throttled to avoid turning every keystroke into a
 * WebSocket round-trip — the backend's presence TTL is 3s, so emitting
 * every 2s keeps the indicator alive without hammering the socket.
 */
export function MessageComposer({
	onSend,
	onTyping,
	disabled,
	placeholder,
}: MessageComposerProps) {
	const [value, setValue] = useState('');
	const lastTypingEmitRef = useRef(0);

	const canSend = value.trim().length > 0 && !disabled;

	function emitTypingThrottled() {
		if (!onTyping) return;
		const now = Date.now();
		if (now - lastTypingEmitRef.current < TYPING_THROTTLE_MS) return;
		lastTypingEmitRef.current = now;
		onTyping();
	}

	async function handleSend() {
		const trimmed = value.trim();
		if (trimmed.length === 0 || disabled) return;
		// Clear the input immediately — optimistic — so the send feels snappy.
		// A failure re-renders a bubble with the `failed` state; the user
		// doesn't lose their typed content because the store retains it.
		setValue('');
		lastTypingEmitRef.current = 0;
		await onSend(trimmed);
	}

	function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
		// Enter without Shift submits; Shift+Enter keeps the newline behaviour.
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			void handleSend();
		}
	}

	return (
		<div className="bg-background flex items-end gap-2 border-t p-3">
			<Textarea
				value={value}
				onChange={event => {
					const next = event.target.value.slice(0, MAX_BODY_LENGTH);
					setValue(next);
					emitTypingThrottled();
				}}
				onKeyDown={handleKeyDown}
				placeholder={placeholder ?? 'Write a message'}
				maxLength={MAX_BODY_LENGTH}
				disabled={disabled}
				className="max-h-40 min-h-10 resize-none"
				aria-label="Message body"
			/>
			<Button
				type="button"
				size="icon"
				onClick={handleSend}
				disabled={!canSend}
				aria-label="Send message"
			>
				<Send className="size-4" />
			</Button>
		</div>
	);
}
