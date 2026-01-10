import { createEnv } from '@t3-oss/env-nextjs';
import z from 'zod';

/**
 * Server-side environment variables
 * These are only accessible on the server and won't be bundled to the client
 */
export const env = createEnv({
	server: {
		BACKEND_URL: z.url().default('http://localhost:4000'),
		APP_URL: z.url().default('http://localhost:3000'),
		STORAGE_MEDIA_URL: z.string().default('http://127.0.0.1:9800'),
	},
	runtimeEnv: {
		BACKEND_URL: process.env.BACKEND_URL,
		APP_URL: process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL,
		STORAGE_MEDIA_URL: process.env.STORAGE_MEDIA_URL,
	},
});
