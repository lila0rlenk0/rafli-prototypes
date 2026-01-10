import { createEnv } from '@t3-oss/env-nextjs';
import z from 'zod';

/**
 * Server-side environment variables
 * These are only accessible on the server and won't be bundled to the client
 */
export const env = createEnv({
	server: {
		BACKEND_URL: z.url(),
		APP_URL: z.url().default('http://localhost:3000'),
	},
	runtimeEnv: {
		BACKEND_URL: process.env.BACKEND_URL,
		APP_URL: process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL,
	},
});
