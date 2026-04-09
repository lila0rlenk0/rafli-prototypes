'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { createQueryClient } from '@/lib/query/client';

/**
 * React Query provider — sits near the root of the client tree so every
 * page and component shares a single QueryClient instance.
 *
 * Scope: wraps the entire app layout. Placed above Web3Provider because
 * wagmi re-uses the nearest QueryClientProvider instead of creating its own.
 *
 * @param children - Child components
 * @returns QueryClientProvider wrapping children with a stable client instance
 */
export function QueryProvider({ children }: { children: ReactNode }) {
	// useState with initializer ensures the client is created exactly once
	// per component lifecycle — avoids re-creating on every render, which
	// would wipe all cached query data and trigger refetch storms.
	const [queryClient] = useState(() => createQueryClient());

	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}
