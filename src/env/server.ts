import { createEnv } from '@t3-oss/env-nextjs';
import z from 'zod';

/**
 * Server-side environment variables
 * These are only accessible on the server and won't be bundled to the client
 */
export const env = createEnv({
	server: {
		BACKEND_URL: z.url(),
	},
	runtimeEnv: {
		BACKEND_URL: process.env.BACKEND_URL,
	},
});
