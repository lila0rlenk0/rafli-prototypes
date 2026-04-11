// Edge runtime Sentry initialization — runs for middleware and edge routes.
// Uses process.env directly because this file executes before t3-env bootstraps.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

import { filterEvent } from '@/lib/sentry/filter';

Sentry.init({
	dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
	// Disabled when DSN is unset (local dev)
	enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

	// Maps to NEXT_PUBLIC_APP_ENV — allows filtering staging vs production in Sentry dashboard
	environment: process.env.NEXT_PUBLIC_APP_ENV ?? 'development',

	// Vercel injects VERCEL_GIT_COMMIT_SHA at build time — ties errors to exact deploy.
	release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

	// Errors only — no performance tracing
	tracesSampleRate: 0,

	// Drops expected business errors, samples network errors, filters browser noise
	beforeSend: filterEvent,
});
