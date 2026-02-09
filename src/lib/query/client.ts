import { QueryClient } from '@tanstack/react-query';

/**
 * Creates a configured QueryClient instance
 * Fetch once, serve from cache. All automatic refetches disabled by default.
 * @returns Configured QueryClient
 */
export function createQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: Infinity,
				gcTime: 5 * 60_000,
				retry: 1,
				refetchOnMount: false,
				refetchOnWindowFocus: false,
				refetchOnReconnect: false,
				refetchInterval: false,
			},
		},
	});
}
