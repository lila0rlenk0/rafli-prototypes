/**
 * Cache revalidation time calculation utilities
 *
 * Provides functions to calculate cache revalidation times based on
 * pre-signed URL expiration timestamps with safety buffers.
 */

/**
 * Cache life configuration for pre-signed URLs
 *
 * - stale: 0 (pre-signed URLs cannot be served stale)
 * - revalidate: calculated from expiration
 * - expire: slightly longer than revalidate to force fresh data
 */
export interface CacheLifeConfig {
	stale: number;
	revalidate: number;
	expire: number;
}

/**
 * Calculates cache life config from URL expiration timestamp
 * Uses 5-minute safety buffer and minimum 60-second cache
 *
 * IMPORTANT: Sets stale to 0 because pre-signed URLs cannot be
 * served from client cache after expiration - they will return 403.
 *
 * @param expiresAt - ISO datetime when URL expires
 * @returns CacheLifeConfig with stale, revalidate, and expire
 */
export function calculateCacheLife(expiresAt: string): CacheLifeConfig {
	const expirationTime = new Date(expiresAt).getTime();
	const currentTime = Date.now();
	const bufferMs = 5 * 60 * 1_000; // 5 minutes
	const timeUntilExpiry = expirationTime - currentTime;
	const revalidateSeconds = Math.max(60, Math.floor((timeUntilExpiry - bufferMs) / 1_000));

	return {
		stale: 0, // Pre-signed URLs cannot be served stale
		revalidate: revalidateSeconds,
		expire: revalidateSeconds + 60, // Force expire shortly after revalidate
	};
}

/**
 * @deprecated Use calculateCacheLife instead for proper stale/expire handling
 */
export function calculateRevalidateTime(expiresAt: string): number {
	const expirationTime = new Date(expiresAt).getTime();
	const currentTime = Date.now();
	const bufferMs = 5 * 60 * 1_000; // 5 minutes
	const timeUntilExpiry = expirationTime - currentTime;
	const revalidateMs = Math.max(60_000, timeUntilExpiry - bufferMs);

	return Math.floor(revalidateMs / 1_000);
}

/**
 * Calculates cache life config from earliest expiring URL in array
 *
 * IMPORTANT: Sets stale to 0 because pre-signed URLs cannot be
 * served from client cache after expiration - they will return 403.
 *
 * @param expiresAtDates - Array of ISO datetime strings
 * @returns CacheLifeConfig based on earliest expiration
 */
export function calculateMinCacheLife(expiresAtDates: string[]): CacheLifeConfig {
	if (expiresAtDates.length === 0) {
		return {
			stale: 0,
			revalidate: 300, // 5 min default
			expire: 360,
		};
	}

	const earliestExpiry = Math.min(
		...expiresAtDates.map(date => new Date(date).getTime()),
	);

	const currentTime = Date.now();
	const bufferMs = 5 * 60 * 1_000;
	const timeUntilExpiry = earliestExpiry - currentTime;
	const revalidateSeconds = Math.max(60, Math.floor((timeUntilExpiry - bufferMs) / 1_000));

	return {
		stale: 0, // Pre-signed URLs cannot be served stale
		revalidate: revalidateSeconds,
		expire: revalidateSeconds + 60,
	};
}

/**
 * @deprecated Use calculateMinCacheLife instead for proper stale/expire handling
 */
export function calculateMinRevalidateTime(expiresAtDates: string[]): number {
	if (expiresAtDates.length === 0) return 300; // 5 min default

	const earliestExpiry = Math.min(
		...expiresAtDates.map(date => new Date(date).getTime()),
	);

	const currentTime = Date.now();
	const bufferMs = 5 * 60 * 1_000;
	const timeUntilExpiry = earliestExpiry - currentTime;
	const revalidateMs = Math.max(60_000, timeUntilExpiry - bufferMs);

	return Math.floor(revalidateMs / 1_000);
}
