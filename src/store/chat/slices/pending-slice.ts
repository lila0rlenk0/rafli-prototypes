import { omitKey } from './shared';
import type { ChatStoreActions, ChatStoreGet, ChatStoreSet } from './types';

type PendingActions = Pick<
	ChatStoreActions,
	'addPending' | 'failPending' | 'clearPending'
>;

/**
 * Owns the optimistic-send lifecycle keyed by `tempId`. Message confirmation
 * lives in the messages slice — this slice only covers the outbound side.
 *
 * @returns Mutators for the pending-send map.
 */
export function createPendingSlice(
	set: ChatStoreSet,
	get: ChatStoreGet,
): PendingActions {
	return {
		addPending(tempId, conversationId, body) {
			set(state => ({
				pendingByTempId: {
					...state.pendingByTempId,
					[tempId]: { conversationId, body, status: 'sending' },
				},
			}));
		},

		failPending(tempId, errorCode) {
			const state = get();
			const existing = state.pendingByTempId[tempId];
			if (!existing) return;
			set({
				pendingByTempId: {
					...state.pendingByTempId,
					[tempId]: { ...existing, status: 'failed', error: errorCode },
				},
			});
		},

		clearPending(tempId) {
			const state = get();
			if (!state.pendingByTempId[tempId]) return;
			set({ pendingByTempId: omitKey(state.pendingByTempId, tempId) });
		},
	};
}
