/**
 * Server-side API clients (server actions only)
 *
 * SECURITY - IP HEADER TRUST CHAIN:
 * ─────────────────────────────────
 * Vercel overwrites x-forwarded-for/x-real-ip at edge (tamper-proof).
 * Cloudflare's cf-connecting-ip is NOT used - Vercel overwrites all incoming headers.
 * For CF→Vercel setups, use Vercel Enterprise "Verified Proxy" feature.
 *
 * SECURITY - S2S SECRET:
 * ──────────────────────
 * X-S2S-Secret proves request originates from this Next.js server.
 * Backend MUST only trust X-Client-IP when X-S2S-Secret is valid.
 * Without validation, attackers can spoof X-Client-IP via direct backend calls.
 *
 * SECURITY - BROWSER CLIENT:
 * ──────────────────────────
 * browserClient (client-browser.ts) has NO S2S secret - would be exposed in DevTools.
 * Backend uses connection IP directly for browser requests (OAuth flows).
 *
 * @see https://vercel.com/docs/headers/request-headers
 * @see https://developers.cloudflare.com/fundamentals/reference/http-headers/
 */
import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { headers } from 'next/headers';

import { env } from '@/env/server';
import { getAuthToken } from '@/lib/auth/session';

/**
 * API base URL with versioned path
 * All backend endpoints use /api/v1 prefix
 */
const API_BASE_URL = `${env.BACKEND_URL}/api/v1`;

/**
 * Gets client IP from Next.js request headers (tamper-proof)
 *
 * SECURITY: Vercel overwrites x-forwarded-for and x-real-ip headers,
 * making them tamper-proof. Clients cannot spoof these values.
 *
 * Priority: x-vercel-forwarded-for → x-forwarded-for → x-real-ip
 *
 * Note: cf-connecting-ip is NOT used - Vercel overwrites all incoming headers.
 * For Cloudflare integration, use Vercel's "Verified Proxy" Enterprise feature.
 *
 * @see https://vercel.com/docs/headers/request-headers
 */
async function getClientIp(): Promise<string | null> {
	const h = await headers();

	return (
		h.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
		h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
		h.get('x-real-ip') ||
		null
	);
}

/**
 * Base client without authentication
 * Used for public endpoints
 */
const baseClient: AxiosInstance = axios.create({
	baseURL: API_BASE_URL,
	timeout: 10_000, // 10 seconds
	headers: {
		'Content-Type': 'application/json',
	},
});

/**
 * Request interceptor to inject S2S secret and client IP
 */
baseClient.interceptors.request.use(
	async config => {
		const clientIp = await getClientIp();

		// Server-to-server authentication
		config.headers['X-S2S-Secret'] = env.S2S_SECRET;

		// Forward client IP (trusted because of S2S secret)
		if (clientIp) {
			config.headers['X-Client-IP'] = clientIp;
		}

		return config;
	},
	error => Promise.reject(error),
);

/**
 * Authenticated client
 * Used for endpoints that require Bearer token
 * The interceptor automatically injects the authentication token
 */
const authenticatedClient: AxiosInstance = axios.create({
	baseURL: API_BASE_URL,
	timeout: 12_500, // 12.5 seconds for authenticated operations
	headers: {
		'Content-Type': 'application/json',
	},
});

/**
 * Request interceptor to validate and inject token + client IP
 * Automatically:
 * - Retrieves the token via getAuthToken()
 * - Validates if the token exists
 * - Injects the token in the Authorization header
 * - Injects the client IP in the X-Client-IP header
 * - Rejects the request with 401 error if there's no token
 */
authenticatedClient.interceptors.request.use(
	async config => {
		const results = await Promise.allSettled([getAuthToken(), getClientIp()]);

		const token = results[0].status === 'fulfilled' ? results[0].value : null;
		const clientIp =
			results[1].status === 'fulfilled' ? results[1].value : null;

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

		// Server-to-server authentication
		config.headers['X-S2S-Secret'] = env.S2S_SECRET;

		// Injects the token in the header
		config.headers.Authorization = `Bearer ${token}`;

		// Injects the client IP if available (trusted because of S2S secret)
		if (clientIp) {
			config.headers['X-Client-IP'] = clientIp;
		}

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

export { authenticatedClient, baseClient, createRequest, getClientIp };
