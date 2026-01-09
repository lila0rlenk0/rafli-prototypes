/**
 * Configured timeouts for different types of API operations
 * Values in milliseconds
 */
export const API_TIMEOUTS = {
	DEFAULT: 10_000, // 10 seconds - default timeout
	UPLOAD: 30_000, // 30 seconds - uploads need more time
	MUTATION: 15_000, // 15 seconds - write operations
	QUERY: 10_000, // 10 seconds - read operations
} as const;

/**
 * Cache tags to identify and invalidate related data groups
 * Used with Next.js revalidateTag()
 */
export const CACHE_TAGS = {
	MY_RAFFLES: 'my-raffles',
	RAFFLE_DETAIL: 'raffle-detail',
} as const;

/**
 * Cache revalidation times in seconds
 * Defines how long the cache is considered valid before being updated
 */
export const CACHE_REVALIDATE = {
	MY_RAFFLES: 60, // 1 minute - personal data changes frequently
	RAFFLE_DETAIL: 300, // 5 minutes - raffle details change less often
	CATEGORIES: 3_600, // 1 hour - almost static data
} as const;
