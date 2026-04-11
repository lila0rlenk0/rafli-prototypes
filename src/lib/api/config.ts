/**
 * Configured timeouts for different types of API operations
 * Values in milliseconds
 */
export const API_TIMEOUTS = {
	DEFAULT: 20_000, // 20 seconds - accounts for serverless cold starts
	QUERY: 20_000, // same as DEFAULT - semantic alias for read operations
	MUTATION: 20_000, // same as DEFAULT - semantic alias for write operations
	UPLOAD: 30_000, // 30 seconds - uploads need more time
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
 * Cache revalidation times in seconds
 * Defines how long the cache is considered valid before being updated
 */
export const CACHE_REVALIDATE = {
	MY_RAFFLES: 60, // 1 minute - personal data changes frequently
	RAFFLE_DETAIL: 300, // 5 minutes - raffle details change less often
	CATEGORIES: 3_600, // 1 hour - almost static data
} as const;

/**
 * Encodes a value for safe interpolation into a URL path segment.
 * Prevents path traversal (../) and slash injection by percent-encoding
 * all characters that are not unreserved (RFC 3986 §2.3).
 *
 * @param value - Raw string to encode (e.g., raffleId, userId, slug)
 * @returns Percent-encoded string safe for URL path interpolation
 */
export function pathParam(value: string): string {
	return encodeURIComponent(value);
}
