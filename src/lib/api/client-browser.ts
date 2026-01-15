import axios from 'axios';

import { clientEnv } from '@/env/client';

/**
 * Browser-side base client
 * Used for client components that need to make API requests
 * Includes credentials for cross-origin cookie support (OAuth flows)
 */
export const browserClient = axios.create({
	baseURL: clientEnv.NEXT_PUBLIC_BACKEND_URL,
	timeout: 10_000,
	withCredentials: true,
	headers: {
		'Content-Type': 'application/json',
	},
});
