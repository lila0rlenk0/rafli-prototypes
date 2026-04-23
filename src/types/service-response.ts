/**
 * Generic service response type for all server actions.
 * Discriminated union — narrow via `result.success` before accessing `result.data`.
 *
 * All server actions return this shape. Components check `result.success` to
 * narrow into the data or error branch. Helper constructors `success()` and
 * `failure()` live in `@/lib/errors/service-result` to avoid circular deps.
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

/** Success branch of ServiceResponse — `data` is available after narrowing on `success: true`. */
export type ServiceSuccess<TData> = {
	readonly success: true;
	readonly data: TData;
};

/** Failure branch of ServiceResponse — `error` is a typed error code after narrowing on `success: false`. */
export type ServiceFailure<TErrorCode extends string> = {
	readonly success: false;
	readonly error: TErrorCode;
};
