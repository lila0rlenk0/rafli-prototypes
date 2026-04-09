'use client';

import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { useStore } from 'zustand';

import { createUserStore, type UserStore } from '@/store/user-store';
import type { Permission } from '@/types/user-mode';

export type UserStoreApi = ReturnType<typeof createUserStore>;

// Context lives at the authenticated layout level — only mounted when
// the user is signed in. Unauthenticated pages never access mode/permissions.
export const UserStoreContext = createContext<UserStoreApi | undefined>(
	undefined,
);

export interface UserStoreProviderProps {
	readonly children: ReactNode;
	readonly permissions: readonly Permission[];
}

/**
 * Provides user store to children. Initializes mode after permissions sync
 * to validate persisted preference against current JWT grants.
 *
 * Scope: wraps the authenticated layout — children include the mode
 * toggle in the header and permission-gated UI throughout the app.
 *
 * @param children - Child components
 * @param permissions - User permissions from server session (always fresh from JWT)
 * @returns Provider wrapping children with user store context
 */
export function UserStoreProvider({
	children,
	permissions,
}: UserStoreProviderProps) {
	// useState initializer — store is created once per provider mount
	// with null mode (hydrated from localStorage by zustand persist)
	const [store] = useState(() =>
		createUserStore({
			mode: null,
			permissions,
		}),
	);

	// Serialize permissions by value — server renders produce a new array reference
	// each time even when contents are identical (same JWT). Without this, the effect
	// re-fires on every router.refresh(), causing redundant cookie writes.
	const permissionsKey = JSON.stringify(permissions);

	// Sync permissions from the server and initialize mode after zustand
	// persist finishes hydrating from localStorage.
	// Deps: permissionsKey (stable string) and store (stable ref).
	// The permissions array reference is intentionally excluded — permissionsKey
	// captures the same information without triggering on every server render.
	useEffect(() => {
		// Step 1: Reconstruct permissions from the serialized key — avoids
		// closing over the permissions prop whose reference changes per render
		const derived = JSON.parse(permissionsKey) as Permission[];

		// Step 2: Push server permissions into the store and validate mode
		function syncAndInitialize() {
			const state = store.getState();
			state.setPermissions(derived);
			state.initializeMode();
		}

		// Step 3: Wait for zustand persist hydration before initializing —
		// calling initializeMode() before hydration would see mode=null and
		// always reset to PARTICIPANT, losing the persisted preference.
		if (store.persist.hasHydrated()) {
			syncAndInitialize();
			return;
		}

		const unsubscribe = store.persist.onFinishHydration(() => {
			syncAndInitialize();
			unsubscribe();
		});
		return unsubscribe;
	}, [permissionsKey, store]);

	return (
		<UserStoreContext.Provider value={store}>
			{children}
		</UserStoreContext.Provider>
	);
}

/**
 * Typed selector hook for the user store.
 *
 * @param selector - Selector function to extract data from store
 * @returns Selected data from store
 * @throws Error if used outside UserStoreProvider
 */
export function useUserStore<T>(selector: (store: UserStore) => T): T {
	const ctx = use(UserStoreContext);

	if (!ctx) {
		throw new Error(`useUserStore must be used within UserStoreProvider`);
	}

	return useStore(ctx, selector);
}
