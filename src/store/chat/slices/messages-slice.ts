import type { Message } from '@/types/chat';

import { mergeMessage, omitKey } from './shared';
import type { ChatStoreActions, ChatStoreGet, ChatStoreSet } from './types';

type MessagesActions = Pick<
	ChatStoreActions,
	'upsertMessage' | 'replaceMessage' | 'softDeleteMessage'
>;

/**
 * Owns the per-conversation message buffer mutators. Pure delegation to
 * `mergeMessage` — callers depending on the original monotonic id order
 * keep working because that helper lives in `shared.ts`.
 *
 * @returns Message mutators backed by the shared merge helper.
 */
export function createMessagesSlice(
	set: ChatStoreSet,
	get: ChatStoreGet,
): MessagesActions {
	return {
		upsertMessage(message, tempId) {
			const state = get();
			const current =
				state.messagesByConversation[message.conversationId] ?? [];
			const nextMessages = mergeMessage(current, message);
			const messagesByConversation = {
				...state.messagesByConversation,
				[message.conversationId]: nextMessages,
			};
			// Resolve the matching optimistic entry so the bubble flips from
			// "sending" to confirmed — identical reference would skip renders.
			const pendingByTempId =
				tempId && state.pendingByTempId[tempId]
					? omitKey(state.pendingByTempId, tempId)
					: state.pendingByTempId;
			set({ messagesByConversation, pendingByTempId });
		},

		replaceMessage(updated) {
			const state = get();
			const current = state.messagesByConversation[updated.conversationId];
			if (!current) return;
			const idx = current.findIndex(m => m.id === updated.id);
			if (idx < 0) return;
			const nextMessages = current.slice();
			nextMessages[idx] = updated;
			set({
				messagesByConversation: {
					...state.messagesByConversation,
					[updated.conversationId]: nextMessages,
				},
			});
		},

		softDeleteMessage(conversationId, messageId) {
			const state = get();
			const current = state.messagesByConversation[conversationId];
			if (!current) return;
			const idx = current.findIndex(m => m.id === messageId);
			if (idx < 0) return;
			// Blank the body client-side as a defensive layer in case the
			// backend ever leaks it in a future payload revision.
			const tombstoned: Message = {
				...current[idx],
				body: null,
				deletedAt: current[idx].deletedAt ?? new Date().toISOString(),
			};
			const nextMessages = current.slice();
			nextMessages[idx] = tombstoned;
			set({
				messagesByConversation: {
					...state.messagesByConversation,
					[conversationId]: nextMessages,
				},
			});
		},
	};
}
