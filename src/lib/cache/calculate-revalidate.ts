/**
 * Cache revalidation time calculation utilities
 *
 * Provides functions to calculate cache revalidation times based on
 * pre-signed URL expiration timestamps with safety buffers.
 */

/**
 * Calculates cache revalidate time from URL expiration timestamp
 * Uses 5-minute safety buffer and minimum 60-second cache
 *
 * @param expiresAt - ISO datetime when URL expires
 * @returns Seconds until revalidation needed
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
 * Finds earliest expiration from multiple timestamps
 *
 * @param expiresAtDates - Array of ISO datetime strings
 * @returns Seconds until earliest expiration
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
