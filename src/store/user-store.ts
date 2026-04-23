import { createJSONStorage, persist } from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';

import { setUserModeCookie } from '@/lib/mode/cookies';
import { PERMISSIONS } from '@/lib/permissions';
import { safeLocalStorage } from '@/lib/utils/persist-storage';
import { USER_MODE, type Permission, type UserMode } from '@/types/user-mode';

// State and action interfaces are split so the provider can type initial
// state without pulling the action bag into SSR-safe call sites.

export interface UserStoreState {
	/** null = not yet initialized from localStorage */
	readonly mode: UserMode | null;
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

/** localStorage key — stable across deploys; renaming drops all user preferences. */
const PERSIST_STORAGE_KEY = 'raffly-user-store';

export const defaultInitState: Readonly<UserStoreState> = {
	mode: null,
	permissions: [],
};

/**
 * Derives the effective mode when initializing from persisted state.
 * Demotes stale HOST to PARTICIPANT when the permission has been revoked
 * (e.g. host suspended) and defaults null → PARTICIPANT for first visits.
 *
 * @returns The mode to render after reconciling with current permissions.
 */
function resolveEffectiveMode(
	persistedMode: UserMode | null,
	options: { canSwitch: boolean },
): UserMode {
	const { canSwitch } = options;
	const isInvalidHostMode = persistedMode === USER_MODE.HOST && !canSwitch;
	if (isInvalidHostMode || persistedMode === null) return USER_MODE.PARTICIPANT;
	return persistedMode;
}

/**
 * Creates a vanilla Zustand store for user mode and permission state.
 * Persisted to localStorage via zustand/middleware so the host/participant
 * preference survives page reloads. Cookie is kept in sync for SSR.
 *
 * @param initState - Initial state for the store.
 * @returns Zustand vanilla store instance with persistence middleware.
 */
export function createUserStore(initState: UserStoreState = defaultInitState) {
	return createStore<UserStore>()(
		persist(
			(set, get) => ({
				...initState,
				switchMode: async () => {
					const { canSwitchMode, mode } = get();
					if (!canSwitchMode() || mode === null) return;
					const newMode =
						mode === USER_MODE.PARTICIPANT
							? USER_MODE.HOST
							: USER_MODE.PARTICIPANT;
					// Store updates synchronously — UI reacts immediately. Await the
					// cookie write so server components read the new value on the
					// next render (e.g. router.refresh() after this call).
					set({ mode: newMode });
					await setUserModeCookie(newMode);
				},
				hasPermission: permission => get().permissions.includes(permission),
				// raffle:create gates hosting — no other permission grants mode switch.
				canSwitchMode: () => get().hasPermission(PERMISSIONS.RAFFLE_CREATE),
				setPermissions: permissions => set({ permissions }),
				initializeMode: () => {
					const { mode, canSwitchMode } = get();
					const effectiveMode = resolveEffectiveMode(mode, {
						canSwitch: canSwitchMode(),
					});
					if (effectiveMode !== mode) set({ mode: effectiveMode });
					// Always sync cookie — heals drift between localStorage and cookie
					// (expired, cleared by browser, or fire-and-forget write failed).
					setUserModeCookie(effectiveMode).catch(console.error);
				},
				// Called on sign-out — clears persisted mode so next user starts fresh.
				reset: () => set({ mode: null, permissions: [] }),
			}),
			{
				name: PERSIST_STORAGE_KEY,
				storage: createJSONStorage(safeLocalStorage),
				// Only persist mode preference — permissions derive from session.
				partialize: (state): Pick<UserStoreState, 'mode'> => ({
					mode: state.mode,
				}),
			},
		),
	);
}
