import { omitKey } from './shared';
import type { ChatStoreActions, ChatStoreGet, ChatStoreSet } from './types';

type UnreadActions = Pick<
	ChatStoreActions,
	'setUnreadSummary' | 'incrementUnread' | 'markConversationRead'
>;

/**
 * Owns the unread badge state — total + per-conversation counters.
 *
 * @returns Unread-count mutators.
 */
export function createUnreadSlice(
	set: ChatStoreSet,
	get: ChatStoreGet,
): UnreadActions {
	return {
		setUnreadSummary(total, byConvo) {
			set({ unreadTotal: total, unreadByConvoId: { ...byConvo } });
		},

		incrementUnread(conversationId) {
			set(state => ({
				unreadTotal: state.unreadTotal + 1,
				unreadByConvoId: {
					...state.unreadByConvoId,
					[conversationId]: (state.unreadByConvoId[conversationId] ?? 0) + 1,
				},
			}));
		},

		markConversationRead(conversationId) {
			const state = get();
			const current = state.unreadByConvoId[conversationId] ?? 0;
			if (current === 0) return;
			// Guard against races where the WS event lands before the mark-read
			// response — clamp to 0.
			set({
				unreadTotal: Math.max(0, state.unreadTotal - current),
				unreadByConvoId: omitKey(state.unreadByConvoId, conversationId),
			});
		},
	};
}
