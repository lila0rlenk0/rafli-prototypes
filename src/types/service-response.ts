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
export type ServiceSuccess<TData> = {
	success: true;
	data: TData;
};

/**
 * Failure response shape with typed error code
 * Contains an error code that can be used to display appropriate messages
 *
 * @template TErrorCode - Union type of possible error codes
 */
export type ServiceFailure<TErrorCode extends string> = {
	success: false;
	error: TErrorCode;
};
