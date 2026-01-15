import axios, { type AxiosInstance } from 'axios';

import { clientEnv } from '@/env/client';

/**
 * Browser-side base client
 * Used for client components that need to make API requests
 * Includes credentials for cross-origin cookie support (OAuth flows)
 *
 * IMPORTANT: This client is for browser-only use cases where:
 * - Cross-origin cookies must be sent (OAuth flows)
 * - Server actions cannot access backend cookies
 */
const browserClient: AxiosInstance = axios.create({
	baseURL: clientEnv.NEXT_PUBLIC_BACKEND_URL,
	timeout: 10_000, // 10 seconds
	withCredentials: true,
	headers: {
		'Content-Type': 'application/json',
	},
});

export { browserClient };
