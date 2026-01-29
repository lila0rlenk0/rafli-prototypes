import { createJSONStorage, persist } from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';

import { setUserModeCookie } from '@/lib/mode/cookies';
import { PERMISSIONS } from '@/lib/permissions';
import { USER_MODE, type Permission, type UserMode } from '@/types/user-mode';

export interface UserStoreState {
	mode: UserMode | null; // null = not yet initialized
	permissions: Permission[];
}

export interface UserStoreActions {
	switchMode: () => void;
	hasPermission: (permission: Permission) => boolean;
	canSwitchMode: () => boolean;
	setPermissions: (permissions: Permission[]) => void;
	initializeMode: () => void;
	reset: () => void;
}

export type UserStore = UserStoreState & UserStoreActions;

export const defaultInitState: UserStoreState = {
	mode: null, // null means not yet initialized
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
				 * Only works if user has raffle:create permission and mode is initialized
				 * Syncs mode to cookie for server-side access
				 */
				switchMode: () => {
					const { canSwitchMode, mode } = get();

					if (!canSwitchMode() || mode === null) {
						return;
					}

					const newMode =
						mode === USER_MODE.PARTICIPANT
							? USER_MODE.HOST
							: USER_MODE.PARTICIPANT;

					set({ mode: newMode });

					// Sync to cookie (fire-and-forget, non-blocking)
					setUserModeCookie(newMode).catch(console.error);
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
				 * Initialize mode based on permissions and persisted preference
				 * Called after permissions are set to validate/set the mode
				 * Only syncs to cookie when mode actually changes to avoid infinite loops
				 */
				initializeMode: () => {
					const { mode, canSwitchMode } = get();

					// If mode is HOST but user lost permission, reset to PARTICIPANT
					if (mode === USER_MODE.HOST && !canSwitchMode()) {
						set({ mode: USER_MODE.PARTICIPANT });
						setUserModeCookie(USER_MODE.PARTICIPANT).catch(console.error);
						return;
					}

					// If mode is null (not initialized), default to PARTICIPANT
					if (mode === null) {
						set({ mode: USER_MODE.PARTICIPANT });
						setUserModeCookie(USER_MODE.PARTICIPANT).catch(console.error);
					}
					// Otherwise keep current mode - no cookie sync needed
					// Cookie will be set on next switchMode or page that reads it
				},

				/**
				 * Reset store to default state
				 * Should be called on sign out to clear persisted data
				 */
				reset: () => {
					set({ mode: null, permissions: [] });
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
				partialize: (state): Pick<UserStoreState, 'mode'> => ({
					mode: state.mode, // Only persist mode preference
				}),
			},
		),
	);
}
