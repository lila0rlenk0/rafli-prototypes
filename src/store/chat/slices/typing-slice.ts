import { omitKey } from './shared';
import type { ChatStoreActions, ChatStoreGet, ChatStoreSet } from './types';

type TypingActions = Pick<ChatStoreActions, 'setTyping' | 'clearTyping'>;

/**
 * Owns typing-indicator state. Indicators are wiped by timer callbacks in
 * `chat-event-dispatch` — this slice only provides set/clear primitives.
 *
 * @returns Typing-indicator mutators.
 */
export function createTypingSlice(
	set: ChatStoreSet,
	get: ChatStoreGet,
): TypingActions {
	return {
		setTyping(conversationId, userId) {
			const state = get();
			const convo = state.typingByConvoId[conversationId] ?? {};
			if (convo[userId]) return;
			set({
				typingByConvoId: {
					...state.typingByConvoId,
					[conversationId]: { ...convo, [userId]: true as const },
				},
			});
		},

		clearTyping(conversationId, userId) {
			const state = get();
			const convo = state.typingByConvoId[conversationId];
			if (!convo || !convo[userId]) return;
			const nextConvo = omitKey(convo, userId);
			set({
				typingByConvoId: {
					...state.typingByConvoId,
					[conversationId]: nextConvo as Readonly<Record<string, true>>,
				},
			});
		},
	};
}
