/**
 * Client Environment Variables
 *
 * Variables accessible in browser code.
 * All variables MUST use NEXT_PUBLIC_ prefix.
 *
 * SECURITY: Never put secrets here - they will be bundled into client JS.
 */

import { createEnv } from '@t3-oss/env-nextjs';
import z from 'zod';
export const clientEnv = createEnv({
	client: {
		NEXT_PUBLIC_BACKEND_URL: z.url().default('http://localhost:4000'),
		NEXT_PUBLIC_MIXPANEL_TOKEN: z.string().optional(),
	},
	runtimeEnv: {
		NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
		NEXT_PUBLIC_MIXPANEL_TOKEN: process.env.NEXT_PUBLIC_MIXPANEL_TOKEN,
	},
});
