import { createEnv } from '@t3-oss/env-nextjs';
import z from 'zod';

/**
 * Server Environment Variables
 *
 * Variables accessible only in server code (server actions, API routes).
 * Never exposed to browser - safe for secrets.
 *
 * SECURITY: S2S_SECRET is used to authenticate server-to-server calls.
 * Backend MUST validate this before trusting X-Client-IP header.
 */
export const env = createEnv({
	server: {
		BACKEND_URL: z.url().default('http://localhost:4000'),
		APP_URL: z.url().default('http://localhost:3000'),
		STORAGE_MEDIA_URL: z.string().default('http://127.0.0.1:9800'),
		STORAGE_MEDIA_URL_USER_AVATARS: z.string().default('http://127.0.0.1:9800'),
		// Server-to-server secret: backend validates this before trusting X-Client-IP
		S2S_SECRET: z.string().min(32),
		MIXPANEL_TOKEN: z.string(),
	},
	runtimeEnv: {
		BACKEND_URL: process.env.BACKEND_URL,
		APP_URL: process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL,
		STORAGE_MEDIA_URL: process.env.STORAGE_MEDIA_URL,
		STORAGE_MEDIA_URL_USER_AVATARS: process.env.STORAGE_MEDIA_URL_USER_AVATARS,
		S2S_SECRET: process.env.S2S_SECRET,
		MIXPANEL_TOKEN: process.env.MIXPANEL_TOKEN,
	},
});
