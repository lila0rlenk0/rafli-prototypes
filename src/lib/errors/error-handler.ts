import type { ServiceFailure, ServiceSuccess } from '@/types/service-response';

/**
 * Error Handler Utilities
 *
 * Helper functions for creating success and failure responses
 * in server actions.
 */

/**
 * Creates a success response
 *
 * @param data - The data to return on success
 * @returns ServiceSuccess response object
 *
 * @example
 * return success({ userId: '123', email: 'user@example.com' });
 */
export function success<TData>(data: TData): ServiceSuccess<TData> {
	return { success: true, data };
}

/**
 * Creates a failure response
 *
 * @param error - The error code to return
 * @returns ServiceFailure response object
 *
 * @example
 * return failure(AUTH_ERROR_CODES.INVALID_CREDENTIALS);
 */
export function failure<TErrorCode extends string>(
	error: TErrorCode,
): ServiceFailure<TErrorCode> {
	return { success: false, error };
}

/**
 * Wraps a try-catch block with automatic error mapping
 * Useful for reducing boilerplate in service functions
 *
 * @param fn - The function to execute (async operation)
 * @param mapError - Function to map caught errors to error codes
 * @returns Promise resolving to ServiceSuccess or ServiceFailure
 *
 * @example
 * return handleServiceError(
 *   async () => {
 *     const response = await baseClient.get('/api/data');
 *     return response.data;
 *   },
 *   mapAuthError
 * );
 */
export async function handleServiceError<TData, TErrorCode extends string>(
	fn: () => Promise<TData>,
	mapError: (error: unknown) => TErrorCode,
): Promise<ServiceSuccess<TData> | ServiceFailure<TErrorCode>> {
	try {
		const data = await fn();
		return success(data);
	} catch (error) {
		return failure(mapError(error));
	}
}
