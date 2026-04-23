/**
 * Encodes a value for safe interpolation into a URL path segment.
 * Prevents path traversal (../) and slash injection by percent-encoding
 * all characters that are not unreserved (RFC 3986 §2.3).
 *
 * Pure helper — lives outside `@/lib/api` so callers (including
 * integration test mocks of the config module) stay oblivious to the
 * `server-only` guard on the HTTP client layer.
 *
 * @param value - Raw string to encode (e.g. raffleId, userId, slug).
 * @returns Percent-encoded string safe for URL path interpolation.
 */
export function pathParam(value: string): string {
	return encodeURIComponent(value);
}
