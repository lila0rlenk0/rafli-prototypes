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
import { USER_MODE, type Permission } from '@/types/user-mode';

export type UserStoreApi = ReturnType<typeof createUserStore>;

export const UserStoreContext = createContext<UserStoreApi | undefined>(
	undefined,
);

export interface UserStoreProviderProps {
	children: ReactNode;
	permissions: string[];
}

/**
 * UserStoreProvider Component
 *
 * Provides the Zustand user store to all child components via Context.
 * Creates store with permissions from server (never from localStorage).
 * Mode preference is loaded from localStorage via persist middleware.
 *
 * @param children - Child components
 * @param permissions - User permissions from server session (always fresh)
 */
export function UserStoreProvider({
	children,
	permissions,
}: UserStoreProviderProps) {
	const [store] = useState(() => {
		const newStore = createUserStore({
			mode: USER_MODE.PARTICIPANT, // Will be overridden by localStorage
			permissions: permissions as Permission[], // Always from server
		});

		// Immediately set permissions from server (before any render)
		// This ensures permissions are correct even on first render
		newStore.getState().setPermissions(permissions as Permission[]);

		return newStore;
	});

	/**
	 * Sync permissions from server when they change
	 * This handles cases where user logs in with different account
	 */
	useEffect(() => {
		store.getState().setPermissions(permissions as Permission[]);
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
