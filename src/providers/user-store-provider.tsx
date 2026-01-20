'use client';

import {
	createContext,
	useContext,
	useEffect,
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
	const [store] = useState(() =>
		createUserStore({
			mode: null, // Start as null, will be initialized after permissions sync
			permissions,
		}),
	);

	/**
	 * Sync permissions and initialize mode
	 * Runs on mount and when permissions change
	 */
	useEffect(() => {
		const state = store.getState();
		state.setPermissions(permissions);
		state.initializeMode();
	}, [permissions, store]);

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
