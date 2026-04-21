'use client';

import { createContext, use, useState, type ReactNode } from 'react';
import { useStore } from 'zustand';

import {
	createCookieConsentStore,
	type CookieConsentStore,
} from '@/store/cookie-consent-store';

export type CookieConsentStoreApi = ReturnType<typeof createCookieConsentStore>;

// Context lives at the app root — mounted above every page so the
// consent banner and Mixpanel provider both read from the same store.
// Each browser tab creates a single store instance that hydrates from
// localStorage via zustand/middleware.
export const CookieConsentStoreContext = createContext<
	CookieConsentStoreApi | undefined
>(undefined);

export interface CookieConsentStoreProviderProps {
	readonly children: ReactNode;
}

/**
 * Provides the cookie consent store to the app. Must wrap every route
 * so the banner can render and the MixpanelProvider can gate its init
 * on consent state. Mounted in `ProvidersClient` above `MixpanelProvider`
 * so the dependency direction is correct (consent → analytics).
 *
 * @param children - Tree of components that need consent awareness
 * @returns Provider wrapping children with the cookie consent context
 */
export function CookieConsentStoreProvider({
	children,
}: CookieConsentStoreProviderProps) {
	// useState initializer — store created once per provider mount and
	// hydrated from localStorage via the persist middleware configured in
	// `createCookieConsentStore`. Remounting the provider (which never
	// happens under the single root layout) would create a fresh store,
	// but persistence would immediately re-populate `status` from disk.
	const [store] = useState(() => createCookieConsentStore());

	return (
		<CookieConsentStoreContext.Provider value={store}>
			{children}
		</CookieConsentStoreContext.Provider>
	);
}

/**
 * Typed selector hook for the cookie consent store.
 *
 * @param selector - Selector function to extract data from store
 * @returns Selected data from store
 * @throws Error if used outside CookieConsentStoreProvider
 */
export function useCookieConsentStore<T>(
	selector: (store: CookieConsentStore) => T,
): T {
	const ctx = use(CookieConsentStoreContext);

	if (!ctx) {
		throw new Error(
			`useCookieConsentStore must be used within CookieConsentStoreProvider`,
		);
	}

	return useStore(ctx, selector);
}
