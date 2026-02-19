/**
 * Checks whether a signed media URL has already expired.
 *
 * Why this helper exists:
 * - Backend returns signed URLs with explicit `expiresAt`.
 * - SSR/route cache can outlive that timestamp and serve stale markup.
 * - We must avoid rendering known-expired URLs to prevent broken image flashes.
 */
export function isSignedUrlExpired(
	expiresAt: null | string | undefined,
	nowMs = Date.now(),
): boolean {
	if (!expiresAt) return false;

	const expiryMs = Date.parse(expiresAt);
	// Optimistic: NaN means unparseable expiry — show image rather than hide it,
	// since the URL may still be valid and a broken-image flash is worse than a 403.
	if (Number.isNaN(expiryMs)) return false;

	return expiryMs <= nowMs;
}
