import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';

import { env } from '@/env/client';
import { getAuthToken } from '@/lib/auth/session';

/**
 * Base client without authentication
 * Used for public endpoints
 */
const baseClient: AxiosInstance = axios.create({
	baseURL: env.NEXT_PUBLIC_BACKEND_URL,
	timeout: 10_000, // 10 seconds
	headers: {
		'Content-Type': 'application/json',
	},
});

/**
 * Authenticated client
 * Used for endpoints that require Bearer token
 * The interceptor automatically injects the authentication token
 */
const authenticatedClient: AxiosInstance = axios.create({
	baseURL: env.NEXT_PUBLIC_BACKEND_URL,
	timeout: 12_500, // 12.5 seconds for authenticated operations
	headers: {
		'Content-Type': 'application/json',
	},
});

/**
 * Request interceptor to validate and inject token
 * Automatically:
 * - Retrieves the token via getAuthToken()
 * - Validates if the token exists
 * - Injects the token in the Authorization header
 * - Rejects the request with 401 error if there's no token
 */
authenticatedClient.interceptors.request.use(
	async config => {
		const token = await getAuthToken();

		// Validates token presence - if not present, rejects the request
		if (!token) {
			return Promise.reject({
				response: {
					status: 401,
					data: { message: 'You must be signed in to perform this action' },
				},
				isAxiosError: true,
				config,
			});
		}

		// Injects the token in the header
		config.headers.Authorization = `Bearer ${token}`;
		return config;
	},
	error => Promise.reject(error),
);

/**
 * Helper to create request with custom timeout
 * @param client - Axios instance (baseClient or authenticatedClient)
 * @param timeout - Custom timeout in milliseconds (optional)
 * @returns Object with configured HTTP methods
 */
function createRequest(client: AxiosInstance, timeout?: number) {
	return {
		get: (url: string, config?: AxiosRequestConfig) =>
			client.get(url, { ...config, timeout: timeout || config?.timeout }),
		post: (url: string, data?: unknown, config?: AxiosRequestConfig) =>
			client.post(url, data, {
				...config,
				timeout: timeout || config?.timeout,
			}),
		put: (url: string, data?: unknown, config?: AxiosRequestConfig) =>
			client.put(url, data, { ...config, timeout: timeout || config?.timeout }),
		patch: (url: string, data?: unknown, config?: AxiosRequestConfig) =>
			client.patch(url, data, {
				...config,
				timeout: timeout || config?.timeout,
			}),
		delete: (url: string, config?: AxiosRequestConfig) =>
			client.delete(url, { ...config, timeout: timeout || config?.timeout }),
	};
}

export { authenticatedClient, baseClient, createRequest };
