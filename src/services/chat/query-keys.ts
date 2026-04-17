/**
 * Shared React Query key factories for the chat domain.
 *
 * Extracted so non-client modules (the WS dispatcher, unit tests) can
 * reference the keys without pulling in the hook files — those import
 * server-only action modules and would break under Bun's test runner.
 */

/** Query key prefix for the conversation list — invalidating this prefix refreshes every paged result. */
export function conversationsKey() {
	return ['chat', 'conversations', 'list'] as const;
}

/** Stable query key for message history within a conversation. */
export function messagesKey(conversationId: string) {
	return ['chat', 'messages', conversationId] as const;
}
