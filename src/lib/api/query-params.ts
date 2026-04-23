import 'server-only';

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
export function buildQueryParams(query?: object): Record<string, string> {
	if (!query) return {};

	const params: Record<string, string> = {};

	for (const [key, value] of Object.entries(query)) {
		if (value === undefined || value === null) continue;
		params[key] = String(value);
	}

	return params;
}

/**
 * Builds URLSearchParams with support for repeated status keys
 *
 * Backend requires repeated params for array values (e.g., status=ended&status=fulfilling)
 * instead of comma-separated values (status=ended,fulfilling).
 *
 * @param query - Query object with optional comma-separated status field
 * @returns URLSearchParams with repeated status keys
 *
 * @example
 * const params = buildQueryParamsWithStatus({
 *   status: 'ended,fulfilling,completed',
 *   limit: 10,
 * });
 * // Returns URLSearchParams: status=ended&status=fulfilling&status=completed&limit=10
 */
export function buildQueryParamsWithStatus<T extends { status?: string }>(
	query?: T,
): URLSearchParams {
	const searchParams = new URLSearchParams();

	if (!query) return searchParams;

	const { status, ...rest } = query;

	// Handle status: split comma-separated values into repeated params
	if (status) {
		for (const statusValue of status.split(',')) {
			searchParams.append('status', statusValue.trim());
		}
	}

	// Add remaining params normally
	const otherParams = buildQueryParams(rest);
	for (const [key, value] of Object.entries(otherParams)) {
		searchParams.append(key, value);
	}

	return searchParams;
}
