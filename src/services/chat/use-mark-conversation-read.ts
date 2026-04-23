'use client';

import { useMutation } from '@tanstack/react-query';

import { markRead } from '@/services/chat/mark-read';

interface MarkReadArgs {
	conversationId: string;
	messageId: string;
}

/**
 * Fire-and-forget mutation that marks a chat conversation as read up to a
 * given message id. The component-side `useEffect` calls `mutate()` so
 * the route component never imports `@/services/*` directly inside an
 * effect body — `local/no-useeffect-data-fetch` (data-fetching.md) bans
 * that pattern.
 *
 * @returns React Query mutation handle
 */
export function useMarkConversationRead() {
	return useMutation({
		mutationFn: async ({ conversationId, messageId }: MarkReadArgs) => {
			const result = await markRead(conversationId, messageId);
			if (!result.success) return;
		},
	});
}
