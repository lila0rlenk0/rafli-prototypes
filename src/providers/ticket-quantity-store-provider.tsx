'use client';

import { createContext, use, useState, type ReactNode } from 'react';
import { useStore } from 'zustand';

import {
	createTicketQuantityStore,
	type TicketQuantityStore,
} from '@/store/ticket-quantity-store';

export type TicketQuantityStoreApi = ReturnType<
	typeof createTicketQuantityStore
>;

// Context lives at the raffle-detail-page level — only mounted on
// /browse/[publicSlug] so other pages never instantiate the store.
// Each provider mount creates a fresh store instance, so navigating
// between raffles automatically resets the selected quantity.
export const TicketQuantityStoreContext = createContext<
	TicketQuantityStoreApi | undefined
>(undefined);

export interface TicketQuantityStoreProviderProps {
	readonly children: ReactNode;
}

/**
 * Provides the ticket quantity store. Wraps the raffle detail page so
 * both the inline `TicketPurchaseCard` (which contains the counter input
 * and desktop bundle quick-picks) and the mobile-only `StickyBuyTicketsCta`
 * (which contains the mobile bundle quick-picks) read and write the same
 * quantity value without prop drilling across the page tree.
 *
 * @param children - Child components
 * @returns Provider wrapping children with ticket quantity store context
 */
export function TicketQuantityStoreProvider({
	children,
}: TicketQuantityStoreProviderProps) {
	// useState initializer — store created once per provider mount.
	// Re-mounting (e.g. navigation to a different raffle) gives a fresh store.
	const [store] = useState(() => createTicketQuantityStore());

	return (
		<TicketQuantityStoreContext.Provider value={store}>
			{children}
		</TicketQuantityStoreContext.Provider>
	);
}

/**
 * Typed selector hook for the ticket quantity store.
 *
 * @param selector - Selector function to extract data from store
 * @returns Selected data from store
 * @throws Error if used outside TicketQuantityStoreProvider
 */
export function useTicketQuantityStore<T>(
	selector: (store: TicketQuantityStore) => T,
): T {
	const ctx = use(TicketQuantityStoreContext);

	if (!ctx) {
		throw new Error(
			`useTicketQuantityStore must be used within TicketQuantityStoreProvider`,
		);
	}

	return useStore(ctx, selector);
}
