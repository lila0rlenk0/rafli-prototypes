import { createJSONStorage, persist } from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';

import { setUserModeCookie } from '@/lib/mode/cookies';
import { PERMISSIONS } from '@/lib/permissions';
import { USER_MODE, type Permission, type UserMode } from '@/types/user-mode';

// --- State & Action interfaces ---
// Separated so the provider can type the initial state without actions.

export interface UserStoreState {
	readonly mode: UserMode | null; // null = not yet initialized from localStorage
	readonly permissions: readonly Permission[];
}

export interface UserStoreActions {
	readonly switchMode: () => Promise<void>;
	readonly hasPermission: (permission: Permission) => boolean;
	readonly canSwitchMode: () => boolean;
	readonly setPermissions: (permissions: readonly Permission[]) => void;
	readonly initializeMode: () => void;
	readonly reset: () => void;
}

export type UserStore = UserStoreState & UserStoreActions;

/** localStorage key used by zustand persist — must be stable across deploys */
const PERSIST_STORAGE_KEY = 'raffly-user-store';

/** Default state — null mode until hydrated from localStorage */
export const defaultInitState: Readonly<UserStoreState> = {
	mode: null,
	permissions: [],
};

/**
 * Creates a vanilla Zustand store for user mode and permission state.
 * Persisted to localStorage via zustand/middleware so the host/participant
 * preference survives page reloads. Cookie is kept in sync for SSR.
 *
 * @param initState - Initial state for the store
 * @returns Zustand vanilla store instance with persistence middleware
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

				hasPermission: permission => {
					const { permissions } = get();
					return permissions.includes(permission);
				},

				// raffle:create is the gate for hosting — no other permission grants mode switch
				canSwitchMode: () => {
					const { hasPermission } = get();
					return hasPermission(PERMISSIONS.RAFFLE_CREATE);
				},

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
					const isInvalidHostMode = mode === USER_MODE.HOST && !canSwitchMode();

					// Resolve effective mode: demote if permission lost, default if unset
					const effectiveMode =
						isInvalidHostMode || mode === null ? USER_MODE.PARTICIPANT : mode;

					if (effectiveMode !== mode) {
						set({ mode: effectiveMode });
					}

					// Always sync cookie — heals any drift between localStorage and cookie
					// (e.g. cookie expired, cleared by browser, or fire-and-forget write failed)
					setUserModeCookie(effectiveMode).catch(console.error);
				},

				// Called on sign-out — clears persisted mode so next user starts fresh
				reset: () => {
					set({ mode: null, permissions: [] });
				},
			}),
			{
				name: PERSIST_STORAGE_KEY,
				storage: createJSONStorage(() => {
					// No-op storage for SSR and restricted browsing contexts
					// (private mode, iframes, embedded WebViews) where
					// localStorage access throws SecurityError.
					const noopStorage = {
						getItem: () => null,
						setItem: () => {},
						removeItem: () => {},
					};
					if (typeof window === 'undefined') return noopStorage;
					try {
						// Probe write+delete — typeof check passes even when access throws
						const probe = '__zustand_storage_probe__';
						localStorage.setItem(probe, '1');
						localStorage.removeItem(probe);
						return localStorage;
					} catch {
						return noopStorage;
					}
				}),
				partialize: (state): Pick<UserStoreState, 'mode'> => ({
					mode: state.mode, // Only persist mode preference
				}),
			},
		),
	);
}
