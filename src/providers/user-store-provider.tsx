'use client';

import {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from 'react';
import { useStore } from 'zustand';

import { createUserStore, type UserStore } from '@/store/user-store';
import type { Permission } from '@/types/user-mode';

export type UserStoreApi = ReturnType<typeof createUserStore>;

export const UserStoreContext = createContext<UserStoreApi | undefined>(
	undefined,
);

export interface UserStoreProviderProps {
	children: ReactNode;
	permissions: Permission[];
}

/**
 * UserStoreProvider Component
 *
 * Provides the Zustand user store to all child components via Context.
 * Creates store with mode: null initially.
 * After permissions are synced, initializes mode (validates against permissions).
 *
 * @param children - Child components
 * @param permissions - User permissions from server session (always fresh)
 */
export function UserStoreProvider({
	children,
	permissions,
}: UserStoreProviderProps) {
	// Stabilize permissions reference — server renders produce a new array
	// each time even when contents are identical (same JWT, same permissions).
	// Without this, the useEffect below re-fires on every router.refresh(),
	// causing redundant initializeMode() calls and unnecessary cookie writes.
	// eslint-disable-next-line react-hooks/exhaustive-deps
	const stablePermissions = useMemo(() => permissions, [permissions.join()]);

	const [store] = useState(() =>
		createUserStore({
			mode: null, // Start as null, will be initialized after permissions sync
			permissions: stablePermissions,
		}),
	);

	/**
	 * Sync permissions and initialize mode after hydration completes
	 * Waits for Zustand persist to finish hydrating from localStorage
	 * before calling initializeMode() to prevent mode revert race condition
	 */
	useEffect(() => {
		function syncAndInitialize() {
			const state = store.getState();
			state.setPermissions(stablePermissions);
			state.initializeMode();
		}

		if (store.persist.hasHydrated()) {
			syncAndInitialize();
		} else {
			const unsubscribe = store.persist.onFinishHydration(() => {
				syncAndInitialize();
				unsubscribe();
			});
			return unsubscribe;
		}
	}, [stablePermissions, store]);

	return (
		<UserStoreContext.Provider value={store}>
			{children}
		</UserStoreContext.Provider>
	);
}

/**
 * Hook to access the user store
 *
 * @param selector - Selector function to extract data from store
 * @returns Selected data from store
 * @throws Error if used outside UserStoreProvider
 */
export function useUserStore<T>(selector: (store: UserStore) => T): T {
	const userStoreContext = useContext(UserStoreContext);

	if (!userStoreContext) {
		throw new Error(`useUserStore must be used within UserStoreProvider`);
	}

	return useStore(userStoreContext, selector);
}
