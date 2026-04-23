import type { ChatStoreActions, ChatStoreSet } from './types';

type PresenceActions = Pick<ChatStoreActions, 'setPresence'>;

/**
 * Owns per-user online/offline state. Hydrated by WS `presence` events.
 *
 * @returns The presence action.
 */
export function createPresenceSlice(set: ChatStoreSet): PresenceActions {
	return {
		setPresence(userId, online) {
			set(state => ({
				presenceByUserId: {
					...state.presenceByUserId,
					[userId]: online,
				},
			}));
		},
	};
}
