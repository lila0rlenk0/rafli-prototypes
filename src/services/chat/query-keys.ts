/**
 * Shared React Query key factories for the chat domain.
 *
 * Extracted so non-client modules (the WS dispatcher, unit tests) can
 * reference the keys without pulling in the hook files — those import
 * server-only action modules and would break under Bun's test runner.
 */

/**
 * Shared prefix for every conversation-scoped React Query entry — covers
 * both the paginated list (`'list'`) and the filter-chip counts (`'counts'`).
 * Invalidating this prefix refetches both so a single WS event (new message,
 * edit, delete, read) updates the sidebar rows *and* the badge numbers
 * together — forgetting counts here is what leaves stale "3 unread" badges
 * after the user reads the last message.
 */
export function conversationsKey() {
	return ['chat', 'conversations'] as const;
}

/**
 * Query key for a specific filter/search/sort combination. Including the
 * params in the key means switching filters swaps caches instead of blowing
 * away the current page — back-and-forth between chips stays instant.
 */
export function conversationsListKey(params: {
	q?: string;
	filter?: string;
	sort?: string;
}) {
	return [
		...conversationsKey(),
		'list',
		{
			q: params.q ?? '',
			filter: params.filter ?? 'all',
			sort: params.sort ?? 'recent',
		},
	] as const;
}

/** Query key for the sidebar header counts — scoped by the active search text. */
export function conversationCountsKey(params: { q?: string }) {
	return [...conversationsKey(), 'counts', { q: params.q ?? '' }] as const;
}

/** Stable query key for message history within a conversation. */
export function messagesKey(conversationId: string) {
	return ['chat', 'messages', conversationId] as const;
}
