import { QueryClient } from '@tanstack/react-query';

/** Garbage-collect inactive queries after 5 minutes of no subscribers */
const GC_TIME_MS = 5 * 60_000;

/** Retry failed queries once before surfacing the error */
const QUERY_RETRY_COUNT = 1;

/**
 * Creates a configured QueryClient instance.
 * Fetch once, serve from cache. All automatic refetches disabled by default.
 * Manual invalidation via `queryClient.invalidateQueries()` is the only refresh path.
 *
 * @returns Configured QueryClient
 */
export function createQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: {
				// Data never goes stale — components always read from cache until manual invalidation
				staleTime: Infinity,
				gcTime: GC_TIME_MS,
				retry: QUERY_RETRY_COUNT,
				refetchOnMount: false,
				refetchOnWindowFocus: false,
				refetchOnReconnect: false,
				refetchInterval: false,
			},
		},
	});
}
