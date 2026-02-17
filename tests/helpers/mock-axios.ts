import { AxiosError, type AxiosResponse } from 'axios';

/**
 * Creates a mock Axios successful response
 * @param data - Response body data
 * @param status - HTTP status code (default 200)
 * @returns Axios-compatible response object
 */
export function mockAxiosResponse<T>(data: T, status = 200): AxiosResponse<T> {
	return {
		data,
		status,
		statusText: 'OK',
		headers: {},
		config: { headers: {} },
	} as AxiosResponse<T>;
}

/**
 * Creates a real AxiosError instance for testing error mappers
 * Supports RFC 7807, network errors, and HTTP status fallbacks
 * @param options - Error configuration
 * @returns AxiosError instance (passes instanceof checks)
 */
export function mockAxiosError(options: {
	status?: number;
	data?: unknown;
	code?: string;
}): AxiosError {
	const { status, data, code } = options;

	const response =
		status || data
			? ({
					status: status ?? 500,
					statusText: 'Error',
					data: data ?? {},
					headers: {},
					config: { headers: {} },
				} as AxiosResponse)
			: undefined;

	return new AxiosError(
		'Request failed',
		code,
		{ headers: {} } as AxiosError['config'],
		undefined,
		response,
	);
}
