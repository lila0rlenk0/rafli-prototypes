/**
 * Service Response Types
 *
 * Generic type definitions for all server action responses.
 * Uses discriminated union pattern for type-safe error handling.
 */

/**
 * Generic service response type for all server actions
 * Uses discriminated union pattern for type-safe error handling
 *
 * @template TData - The type of successful response data
 * @template TErrorCode - Union type of possible error codes (defaults to string)
 *
 * @example
 * type SignInResponse = ServiceResponse<
 *   { userId: string },
 *   AuthErrorCode
 * >;
 */
export type ServiceResponse<TData, TErrorCode extends string = string> =
	| ServiceSuccess<TData>
	| ServiceFailure<TErrorCode>;

/**
 * Success response shape
 * Contains the data returned by the service action
 *
 * @template TData - The type of the data payload
 */
export interface ServiceSuccess<TData> {
	success: true;
	data: TData;
}

/**
 * Failure response shape with typed error code
 * Contains an error code that can be used to display appropriate messages
 *
 * @template TErrorCode - Union type of possible error codes
 */
export interface ServiceFailure<TErrorCode extends string> {
	success: false;
	error: TErrorCode;
}

/**
 * Type guard to check if response is successful
 * Narrows type to ServiceSuccess<TData>
 *
 * @param response - The service response to check
 * @returns True if the response is successful
 *
 * @example
 * const response = await signInUser(data);
 * if (isSuccess(response)) {
 *   // TypeScript knows: response.data exists
 *   console.log(response.data);
 * }
 */
export function isSuccess<TData, TErrorCode extends string>(
	response: ServiceResponse<TData, TErrorCode>,
): response is ServiceSuccess<TData> {
	return response.success === true;
}

/**
 * Type guard to check if response is a failure
 * Narrows type to ServiceFailure<TErrorCode>
 *
 * @param response - The service response to check
 * @returns True if the response is a failure
 *
 * @example
 * const response = await signInUser(data);
 * if (isFailure(response)) {
 *   // TypeScript knows: response.error exists
 *   console.log(response.error);
 * }
 */
export function isFailure<TData, TErrorCode extends string>(
	response: ServiceResponse<TData, TErrorCode>,
): response is ServiceFailure<TErrorCode> {
	return response.success === false;
}
