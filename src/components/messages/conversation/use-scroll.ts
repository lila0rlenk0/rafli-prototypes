'use client';

import { useEffect, useRef, type RefObject } from 'react';

import { shouldAutoScrollToBottom } from '../chat/chat-present';

interface UseConversationScrollArgs {
	/**
	 * Count of confirmed messages rendered in the scrollable region. Changes
	 * on new-message arrival, paging in older history, and on conversation
	 * remount.
	 */
	readonly messagesCount: number;
	/**
	 * Count of in-flight optimistic sends — included so an Enter-press scrolls
	 * the freshly added pending bubble into view even before the ack lands.
	 */
	readonly pendingCount: number;
}

interface UseConversationScrollResult {
	/**
	 * Ref attached to the scrollable container. Consumer spreads it onto the
	 * `<div ref={…}>` that wraps the message list.
	 */
	readonly scrollContainerRef: RefObject<HTMLDivElement | null>;
}

/**
 * Owns the auto-scroll-to-bottom behavior for a single conversation pane.
 *
 * Two triggers:
 *   - first non-empty render jumps to bottom regardless of distance so the
 *     user lands on the newest bubble (messages are stored ascending, so
 *     scrollTop=0 would mean OLDEST — wrong for chat UX).
 *   - subsequent arrivals only scroll when the user is already near the
 *     bottom, via `shouldAutoScrollToBottom` — reading history shouldn't
 *     yank the viewport away.
 *
 * Fresh state is enforced by remount: `chat/inbox.tsx` keys the
 * ConversationView on `conversation.id`, so navigating between
 * conversations gives us a fresh `firstScrollDoneRef = false` without an
 * extra reset effect.
 *
 * @param args - Live counts so the effect re-evaluates on content change.
 * @returns Ref to attach to the scrollable container.
 */
export function useConversationScroll(
	args: UseConversationScrollArgs,
): UseConversationScrollResult {
	const { messagesCount, pendingCount } = args;
	const scrollContainerRef = useRef<HTMLDivElement | null>(null);
	const firstScrollDoneRef = useRef(false);

	useEffect(
		function scrollToBottomOnNew() {
			const el = scrollContainerRef.current;
			if (!el) return;
			const distanceFromBottom =
				el.scrollHeight - el.scrollTop - el.clientHeight;
			const hasAnything = messagesCount + pendingCount > 0;
			const shouldScroll = shouldAutoScrollToBottom({
				firstScrollDone: firstScrollDoneRef.current,
				distanceFromBottom,
				hasMessages: hasAnything,
			});
			if (!shouldScroll) return;
			el.scrollTop = el.scrollHeight;
			firstScrollDoneRef.current = true;
		},
		[messagesCount, pendingCount],
	);

	return { scrollContainerRef };
}
