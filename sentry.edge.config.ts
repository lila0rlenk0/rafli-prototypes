// Edge runtime Sentry initialization — runs for middleware and edge routes.
// Uses process.env directly because this file executes before t3-env bootstraps.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

import { BROWSER_NOISE_PATTERNS, filterEvent } from '@/lib/sentry/filter';
import { attachVercelIdTag } from '@/lib/sentry/vercel-id-processor';

Sentry.init({
	dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
	// Disabled when DSN is unset (local dev)
	enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

	// Maps to NEXT_PUBLIC_APP_ENV — allows filtering staging vs production in Sentry dashboard
	environment: process.env.NEXT_PUBLIC_APP_ENV ?? 'development',

	// Vercel injects VERCEL_GIT_COMMIT_SHA at build time — ties errors to exact deploy.
	release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

	// Errors only — no performance tracing on the edge runtime
	tracesSampleRate: 0,

	// Prefilter known third-party noise — see filter.ts and
	// sentry.server.config.ts for the rationale behind the shared list.
	ignoreErrors: [...BROWSER_NOISE_PATTERNS],

	// Drops expected business errors, samples network errors, filters browser noise
	beforeSend: filterEvent,
});

Sentry.getGlobalScope().addEventProcessor(attachVercelIdTag);
