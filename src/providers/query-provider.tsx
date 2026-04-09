'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { createQueryClient } from '@/lib/query/client';

/**
 * React Query provider with stable client instance
 * @param children - Child components
 * @returns QueryClientProvider wrapping children with a stable client instance
 */
export function QueryProvider({ children }: { children: ReactNode }) {
	const [queryClient] = useState(() => createQueryClient());

	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}
