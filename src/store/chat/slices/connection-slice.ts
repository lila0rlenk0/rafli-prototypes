import { defaultInitState } from './types';
import type { ChatStoreActions, ChatStoreSet } from './types';

type ConnectionActions = Pick<ChatStoreActions, 'setConnected' | 'reset'>;

/**
 * Owns the `connected` flag plus the global `reset` action (called on
 * sign-out). `reset` lives here rather than in a dedicated slice because
 * it is a single line and conceptually pairs with lifecycle concerns.
 *
 * @returns The connection + reset action bag.
 */
export function createConnectionSlice(set: ChatStoreSet): ConnectionActions {
	return {
		setConnected(connected) {
			set({ connected });
		},
		reset() {
			set({ ...defaultInitState });
		},
	};
}
