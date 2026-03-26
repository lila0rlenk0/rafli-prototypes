import { createEnv } from '@t3-oss/env-nextjs';
import z from 'zod';

/**
 * Client Environment Variables
 *
 * Variables accessible in browser code.
 * All variables MUST use NEXT_PUBLIC_ prefix (except NODE_ENV which is built-in).
 *
 * SECURITY: Never put secrets here - they will be bundled into client JS.
 */
export const clientEnv = createEnv({
	shared: {
		NODE_ENV: z
			.enum(['development', 'production', 'test'])
			.default('development'),
	},
	client: {
		NEXT_PUBLIC_APP_ENV: z
			.enum(['development', 'staging', 'production'])
			.default('development'),
		NEXT_PUBLIC_BACKEND_URL: z.url().default('http://localhost:4000'),
		NEXT_PUBLIC_MIXPANEL_TOKEN: z.string(),
		NEXT_PUBLIC_ARBISCAN_BASE_URL: z.url().default('https://arbiscan.io'),
		NEXT_PUBLIC_VRF_CONTRACT_ADDRESS: z.string().min(1),
		NEXT_PUBLIC_IPFS_GATEWAY_URL: z
			.url()
			.default('https://gateway.pinata.cloud/ipfs/'),
		NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: z.string().min(1).optional(),
		NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
	},
	runtimeEnv: {
		NODE_ENV: process.env.NODE_ENV,
		NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
		NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
		NEXT_PUBLIC_MIXPANEL_TOKEN: process.env.NEXT_PUBLIC_MIXPANEL_TOKEN,
		NEXT_PUBLIC_ARBISCAN_BASE_URL: process.env.NEXT_PUBLIC_ARBISCAN_BASE_URL,
		NEXT_PUBLIC_VRF_CONTRACT_ADDRESS:
			process.env.NEXT_PUBLIC_VRF_CONTRACT_ADDRESS,
		NEXT_PUBLIC_IPFS_GATEWAY_URL: process.env.NEXT_PUBLIC_IPFS_GATEWAY_URL,
		NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID:
			process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
		NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
	},
	skipValidation: process.env.CI === 'true',
});
