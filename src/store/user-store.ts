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
	switchMode: () => Promise<void>;
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
				 * Returns a promise that resolves when the cookie is written —
				 * callers should await before triggering server re-renders
				 */
				switchMode: async () => {
					const { canSwitchMode, mode } = get();

					if (!canSwitchMode() || mode === null) {
						return;
					}

					const newMode =
						mode === USER_MODE.PARTICIPANT
							? USER_MODE.HOST
							: USER_MODE.PARTICIPANT;

					// Store updates synchronously — UI reacts immediately
					set({ mode: newMode });

					// Await cookie write so server components read the correct value
					// on the next render (e.g. router.refresh() after this call)
					await setUserModeCookie(newMode);
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
				 *
				 * Determines effective mode:
				 * - HOST without permission → demote to PARTICIPANT
				 * - null (first visit) → default to PARTICIPANT
				 * - otherwise → keep persisted preference
				 *
				 * ALWAYS syncs cookie to match store — prevents server/client drift
				 * that causes split-brain between server-rendered and client-rendered UI
				 */
				initializeMode: () => {
					const { mode, canSwitchMode } = get();

					// Resolve effective mode: demote if permission lost, default if unset
					const effectiveMode =
						(mode === USER_MODE.HOST && !canSwitchMode()) || mode === null
							? USER_MODE.PARTICIPANT
							: mode;

					if (effectiveMode !== mode) {
						set({ mode: effectiveMode });
					}

					// Always sync cookie — heals any drift between localStorage and cookie
					// (e.g. cookie expired, cleared by browser, or fire-and-forget write failed)
					setUserModeCookie(effectiveMode).catch(console.error);
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
