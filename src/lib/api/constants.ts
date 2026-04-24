import 'server-only';

/**
 * Configured timeouts for different types of API operations
 * Values in milliseconds
 */
export const API_TIMEOUTS = {
	// 20 seconds — accounts for serverless cold starts
	DEFAULT: 20_000,
	// semantic alias for read operations
	QUERY: 20_000,
	// semantic alias for write operations
	MUTATION: 20_000,
	// 30 seconds — uploads need more time
	UPLOAD: 30_000,
} as const;

/**
 * Retry configuration for transient failures (cold starts, network blips)
 * Only applies to idempotent methods (GET, HEAD)
 */
export const API_RETRY = {
	MAX_ATTEMPTS: 1,
	RETRYABLE_CODES: ['ECONNABORTED', 'ERR_NETWORK', 'ETIMEDOUT'],
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
 * Upper bound for Server Action + RSC render duration on action pages.
 * Sits comfortably above `API_TIMEOUTS.DEFAULT` (20s) but well below
 * Vercel Pro's 300s default — bounds the blast radius of any unbounded
 * upstream stall (e.g. a third-party SDK without its own timeout) so a
 * hung invocation surfaces to the user as a 30s error instead of 300s.
 */
export const SERVER_ACTION_MAX_DURATION_SECONDS = 30;

/**
 * Cache revalidation times in seconds
 * Defines how long the cache is considered valid before being updated
 */
export const CACHE_REVALIDATE = {
	// 1 minute — personal data changes frequently
	MY_RAFFLES: 60,
	// 5 minutes — raffle details change less often
	RAFFLE_DETAIL: 300,
	// 1 hour — almost static data
	CATEGORIES: 3_600,
} as const;
