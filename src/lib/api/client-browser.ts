/**
 * Browser-side API client (OAuth flows only)
 *
 * SECURITY - NO S2S SECRET:
 * ─────────────────────────
 * DevTools network tab exposes all headers - secrets here would leak.
 * Backend must use connection IP directly (not X-Client-IP).
 * Only used for OAuth where cross-origin cookies are required.
 *
 * USAGE:
 * ──────
 * Only import this in 'use client' components for OAuth flows.
 * For all other API calls, use server actions with baseClient/authenticatedClient.
 */

import axios, { type AxiosInstance } from 'axios';

import { clientEnv } from '@/env/client';

/**
 * API base URL with versioned path
 * All backend endpoints use /api/v1 prefix
 */
const API_BASE_URL = `${clientEnv.NEXT_PUBLIC_BACKEND_URL}/api/v1`;

/**
 * Browser-side axios instance for OAuth flows
 *
 * Features:
 * - withCredentials: Sends cookies cross-origin (required for OAuth)
 * - No S2S secret (would be exposed in browser)
 * - Uses public backend URL from client env
 */
const browserClient: AxiosInstance = axios.create({
	baseURL: API_BASE_URL,
	timeout: 10_000, // 10 seconds
	withCredentials: true,
	headers: {
		'Content-Type': 'application/json',
	},
});

export { browserClient };
