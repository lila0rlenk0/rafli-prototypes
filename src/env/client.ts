import { createEnv } from '@t3-oss/env-nextjs';
import z from 'zod';

/**
 * Client-side environment variables — validated at build time via Zod.
 * SECURITY: Never put secrets here — all values are bundled into client JS.
 *
 * The `process.env` references in `runtimeEnv` are required by @t3-oss/env-nextjs
 * for static analysis — Next.js inlines NEXT_PUBLIC_ vars at build time, so the
 * library needs the literal `process.env.NEXT_PUBLIC_X` expression to resolve them.
 *
 * @returns Validated client environment variables
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
		// Rafli-owned VRF consumer contract — receives randomness from Chainlink and selects winners
		NEXT_PUBLIC_VRF_HANDLER_ADDRESS: z.string().min(1),
		// Chainlink VRF Coordinator — the on-chain oracle that generates verifiable randomness
		NEXT_PUBLIC_VRF_COORDINATOR_ADDRESS: z.string().min(1),
		NEXT_PUBLIC_IPFS_GATEWAY_URL: z
			.url()
			.default('https://gateway.pinata.cloud/ipfs/'),
		// Static media CDN — fronts the S3 media bucket. Same origin for staging + prod;
		// environment isolation is by key prefix in the bucket, not by hostname.
		// Trailing slash forbidden so callers can compose `${cdn}/path` safely.
		NEXT_PUBLIC_CDN_URL: z
			.url()
			.refine(u => !u.endsWith('/'), 'CDN URL must not end with "/"')
			.default('https://cdn-media.raffly.win'),
		// Optional — Web3 features degrade gracefully when unset
		NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: z.string().min(1).optional(),
		// Optional — Sentry disabled when unset (local dev)
		NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
		// Cloudflare Turnstile sitekey — public; backend Better Auth captcha plugin
		// validates the token. Use Cloudflare's `1x00000000000000000000AA` (always
		// passes) for local/CI; real key per environment otherwise.
		NEXT_PUBLIC_TURNSTILE_SITE_KEY: z
			.string()
			.min(1)
			.default('1x00000000000000000000AA'),
	},
	// Required by @t3-oss/env-nextjs — literal process.env references for static analysis
	runtimeEnv: {
		NODE_ENV: process.env.NODE_ENV,
		NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
		NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
		NEXT_PUBLIC_MIXPANEL_TOKEN: process.env.NEXT_PUBLIC_MIXPANEL_TOKEN,
		NEXT_PUBLIC_ARBISCAN_BASE_URL: process.env.NEXT_PUBLIC_ARBISCAN_BASE_URL,
		NEXT_PUBLIC_VRF_HANDLER_ADDRESS:
			process.env.NEXT_PUBLIC_VRF_HANDLER_ADDRESS,
		NEXT_PUBLIC_VRF_COORDINATOR_ADDRESS:
			process.env.NEXT_PUBLIC_VRF_COORDINATOR_ADDRESS,
		NEXT_PUBLIC_IPFS_GATEWAY_URL: process.env.NEXT_PUBLIC_IPFS_GATEWAY_URL,
		NEXT_PUBLIC_CDN_URL: process.env.NEXT_PUBLIC_CDN_URL,
		NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID:
			process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
		NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
		NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
	},
	// CI builds skip validation — env vars may not be present during type-checking
	skipValidation: process.env.CI === 'true',
});
