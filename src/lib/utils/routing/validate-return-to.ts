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
	// Step 1: Handle empty input with default fallback.
	if (!returnTo) {
		return defaultPath;
	}

	// Step 2: Require a safe relative path (single leading slash).
	if (!returnTo.startsWith('/') || returnTo.startsWith('//')) {
		return defaultPath;
	}

	// Step 2b: Reject backslash — some URL parsers treat `\/` as `//` (protocol-relative).
	// Modern browsers don't, but defense-in-depth against parser inconsistencies.
	if (returnTo.includes('\\')) {
		return defaultPath;
	}

	// Step 3: Reject any obvious protocol-based or scriptable URLs.
	const lowercased = returnTo.toLowerCase();
	if (
		lowercased.includes('://') ||
		lowercased.startsWith('javascript:') ||
		lowercased.startsWith('data:')
	) {
		return defaultPath;
	}

	// Step 4: Decode once and re-check for encoded attacks.
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
