/**
 * Validates and sanitizes a returnTo URL parameter to prevent open redirect attacks.
 *
 * Only allows relative paths that start with "/" and don't redirect to external sites.
 *
 * @param returnTo - The returnTo parameter from URL
 * @param defaultPath - Fallback path if validation fails (default: '/browse')
 * @returns Safe path to redirect to
 */
export function validateReturnTo(
	returnTo: string | null,
	defaultPath = '/browse',
): string {
	if (!returnTo) {
		return defaultPath;
	}

	// Must start with single slash (not //)
	if (!returnTo.startsWith('/') || returnTo.startsWith('//')) {
		return defaultPath;
	}

	// Block protocol-relative URLs and javascript: URLs
	const lowercased = returnTo.toLowerCase();
	if (
		lowercased.includes('://') ||
		lowercased.startsWith('javascript:') ||
		lowercased.startsWith('data:')
	) {
		return defaultPath;
	}

	// Decode and re-check for encoded attacks
	try {
		const decoded = decodeURIComponent(returnTo);
		if (decoded.includes('://') || decoded.startsWith('//')) {
			return defaultPath;
		}
	} catch {
		// Invalid encoding - reject
		return defaultPath;
	}

	return returnTo;
}
