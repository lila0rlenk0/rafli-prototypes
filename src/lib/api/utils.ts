/**
 * API utility functions for common request operations
 */

/**
 * Builds query parameters for API requests by filtering out undefined/null values
 * and converting numbers to strings
 *
 * @param query - Object containing query parameters
 * @returns Clean object with only defined values, ready for axios params
 *
 * @example
 * const params = buildQueryParams({
 *   status: 'active',
 *   limit: 10,
 *   page: undefined,
 *   category: null,
 * });
 * // Returns: { status: 'active', limit: '10' }
 */
export function buildQueryParams(
	query?: object,
): Record<string, string> {
	if (!query) return {};

	const params: Record<string, string> = {};

	for (const [key, value] of Object.entries(query)) {
		// Skip undefined and null values
		if (value === undefined || value === null) {
			continue;
		}

		// Convert value to string
		params[key] = String(value);
	}

	return params;
}
