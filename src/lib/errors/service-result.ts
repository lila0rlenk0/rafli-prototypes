import type {
	ServiceFailure,
	ServiceFieldIssue,
	ServiceSuccess,
} from '@/types/service-response';

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
 * Creates a failure response.
 *
 * `fieldIssues` is an opt-in second argument that propagates field-level
 * validation errors from the backend (`global:validation:invalid-payload`)
 * up to the form so callers can call `setError(path, message)` inline.
 * Existing callers that pass only the code keep the original behaviour.
 *
 * @param error - The error code to return
 * @param fieldIssues - Optional per-field issues for inline form rendering
 * @returns ServiceFailure response object
 *
 * @example
 * return failure(AUTH_ERROR_CODES.INVALID_CREDENTIALS);
 * @example
 * return failure(COMMON_ERROR_CODES.VALIDATION_ERROR, extractValidationIssues(error));
 */
export function failure<TErrorCode extends string>(
	error: TErrorCode,
	fieldIssues?: readonly ServiceFieldIssue[],
): ServiceFailure<TErrorCode> {
	if (fieldIssues && fieldIssues.length > 0) {
		return { success: false, error, fieldIssues };
	}
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
