import * as Sentry from '@sentry/nextjs';

import { filterEvent } from '@/lib/sentry/filter';

Sentry.init({
	dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
	enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

	// Maps to NEXT_PUBLIC_APP_ENV — allows filtering staging vs production in Sentry dashboard
	environment: process.env.NEXT_PUBLIC_APP_ENV ?? 'development',

	// Vercel injects VERCEL_GIT_COMMIT_SHA at build time — ties errors to exact deploy.
	// Matches the release used for source map uploads in next.config.ts.
	release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

	// Errors only — no performance tracing
	tracesSampleRate: 0,

	beforeSend: filterEvent,
});
