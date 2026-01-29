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
		NEXT_PUBLIC_BACKEND_URL: z.url().default('http://localhost:4000'),
		NEXT_PUBLIC_MIXPANEL_TOKEN: z.string(),
	},
	runtimeEnv: {
		NODE_ENV: process.env.NODE_ENV,
		NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
		NEXT_PUBLIC_MIXPANEL_TOKEN: process.env.NEXT_PUBLIC_MIXPANEL_TOKEN,
	},
});
