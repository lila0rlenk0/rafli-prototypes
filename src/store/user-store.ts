import { createJSONStorage, persist } from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';

import { PERMISSIONS } from '@/lib/permissions';
import { USER_MODE, type Permission, type UserMode } from '@/types/user-mode';

export interface UserStoreState {
	mode: UserMode;
	permissions: Permission[];
}

export interface UserStoreActions {
	switchMode: () => void;
	hasPermission: (permission: Permission) => boolean;
	canSwitchMode: () => boolean;
	setPermissions: (permissions: Permission[]) => void;
	reset: () => void;
}

export type UserStore = UserStoreState & UserStoreActions;

export const defaultInitState: UserStoreState = {
	mode: USER_MODE.PARTICIPANT,
	permissions: [],
};

/**
 * Creates a new user store instance
 *
 * @param initState - Initial state for the store
 * @returns Zustand store instance
 */
export function createUserStore(initState: UserStoreState = defaultInitState) {
	return createStore<UserStore>()(
		persist(
			(set, get) => ({
				...initState,

				/**
				 * Toggle between participant and host mode
				 * Only works if user has raffle:create permission
				 */
				switchMode: () => {
					const { canSwitchMode, mode } = get();

					if (!canSwitchMode()) {
						return;
					}

					const newMode =
						mode === USER_MODE.PARTICIPANT
							? USER_MODE.HOST
							: USER_MODE.PARTICIPANT;

					set({ mode: newMode });
				},

				/**
				 * Check if user has a specific permission
				 *
				 * @param permission - Permission to check
				 * @returns true if user has the permission
				 */
				hasPermission: permission => {
					const { permissions } = get();
					return permissions.includes(permission);
				},

				/**
				 * Check if user can switch between modes
				 * Requires raffle:create permission
				 *
				 * @returns true if user can switch modes
				 */
				canSwitchMode: () => {
					const { hasPermission } = get();
					return hasPermission(PERMISSIONS.RAFFLE_CREATE);
				},

				/**
				 * Update user permissions from server
				 *
				 * @param permissions - New permissions array
				 */
				setPermissions: permissions => {
					set({ permissions });
				},

				/**
				 * Reset store to default state
				 * Should be called on sign out to clear persisted data
				 */
				reset: () => {
					set(defaultInitState);
				},
			}),
			{
				name: 'raffly-user-store',
				storage: createJSONStorage(() => {
					// Return a no-op storage during SSR
					if (typeof window === 'undefined') {
						return {
							getItem: () => null,
							setItem: () => {},
							removeItem: () => {},
						};
					}
					return localStorage;
				}),
				partialize: state =>
					({
						mode: state.mode, // Only persist mode preference
					}) as UserStore,
			},
		),
	);
}
