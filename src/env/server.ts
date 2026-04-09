import { createEnv } from '@t3-oss/env-nextjs';
import z from 'zod';

/**
 * Server-only environment variables — validated at startup via Zod.
 * SECURITY: S2S_SECRET authenticates server-to-server calls.
 * Backend MUST validate it before trusting the X-Client-IP header.
 *
 * The `process.env` references in `runtimeEnv` are required by @t3-oss/env-nextjs
 * for static analysis — the library reads them to build the validated object.
 *
 * @returns Validated server environment variables
 */
export const env = createEnv({
	server: {
		BACKEND_URL: z.url().default('http://localhost:4000'),
		APP_URL: z.url().default('http://localhost:3000'),
		// Minimum 32 chars — short secrets are brute-forceable
		S2S_SECRET: z.string().min(32),
		MIXPANEL_TOKEN: z.string(),
		// Optional — Sentry disabled when unset (local dev)
		SENTRY_DSN: z.string().url().optional(),
	},
	// Required by @t3-oss/env-nextjs — literal process.env references for static analysis
	runtimeEnv: {
		BACKEND_URL: process.env.BACKEND_URL,
		APP_URL: process.env.APP_URL,
		S2S_SECRET: process.env.S2S_SECRET,
		MIXPANEL_TOKEN: process.env.MIXPANEL_TOKEN,
		SENTRY_DSN: process.env.SENTRY_DSN,
	},
	// CI builds skip validation — env vars may not be present during type-checking
	skipValidation: process.env.CI === 'true',
});
