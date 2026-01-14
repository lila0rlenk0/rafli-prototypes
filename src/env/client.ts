import { createEnv } from '@t3-oss/env-nextjs';
import z from 'zod';

/**
 * Client-side environment variables
 * These are accessible in the browser and must use NEXT_PUBLIC_ prefix
 */
export const clientEnv = createEnv({
	client: {
		NEXT_PUBLIC_BACKEND_URL: z.url().default('http://localhost:4000'),
	},
	runtimeEnv: {
		NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
	},
});
