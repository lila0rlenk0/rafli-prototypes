/**
 * Typed error shape for failed service responses in React Query
 */
export interface ServiceError<E extends string = string> {
	code: E;
	message: string;
}

/**
 * Creates a ServiceError from a typed error code
 * @param code - The typed error code from ServiceResponse
 * @returns ServiceError object
 */
export function serviceError<E extends string>(code: E): ServiceError<E> {
	return { code, message: `Service error: ${code}` };
}
