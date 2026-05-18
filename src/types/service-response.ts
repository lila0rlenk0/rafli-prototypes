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
	/**
	 * Optional field-level issues surfaced by the backend's Zod validator.
	 * Populated when the request was rejected with `global:validation:invalid-payload`
	 * (or any backend ProblemDetails that ships a `validationIssues` array).
	 * Callers can iterate this to drive `setError` on a `react-hook-form` form
	 * without exposing raw axios errors.
	 */
	readonly fieldIssues?: readonly ServiceFieldIssue[];
};

/**
 * Single field-level validation issue. Mirrors the backend's
 * `validationIssues` entry shape from `src/shared/validators.ts`.
 *
 * `path` is the Zod-style dotted path (`"endAt"`, `"cryptoTokenPricing.0.price"`)
 * — convert to form field names at the call site rather than encoding routing
 * decisions here.
 */
export type ServiceFieldIssue = {
	readonly path: string;
	readonly message: string;
	readonly code?: string;
};
