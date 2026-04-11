// Client-side Sentry initialization — runs when a user loads any page.
// Uses process.env directly because this file executes before t3-env bootstraps.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

import { BROWSER_NOISE_PATTERNS, filterEvent } from '@/lib/sentry/filter';

Sentry.init({
	dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
	// Disabled when DSN is unset (local dev)
	enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

	// Maps to NEXT_PUBLIC_APP_ENV — allows filtering staging vs production in Sentry dashboard
	environment: process.env.NEXT_PUBLIC_APP_ENV ?? 'development',

	// Vercel injects VERCEL_GIT_COMMIT_SHA at build time — ties errors to exact deploy.
	// Matches the release used for source map uploads in next.config.ts.
	release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

	// 1% transaction sampling — enables breadcrumb trees (navigation, fetch,
	// click) on captured errors without meaningful quota cost. At typical
	// traffic this is a few dozen transactions per day, but it unblocks
	// stack-adjacent debugging context that would otherwise be lost when
	// tracesSampleRate is 0.
	tracesSampleRate: 0.01,

	// Prefilter known third-party and browser-extension noise before the
	// event is assembled. Substrings match against `exception.values[0].value`
	// inside Sentry's InboundFilters integration — same patterns used as a
	// fallback inside `beforeSend` for the synthesized-title code path.
	ignoreErrors: [...BROWSER_NOISE_PATTERNS],

	// Drops expected business errors, samples network errors, filters browser noise
	beforeSend: filterEvent,
});

// Required by @sentry/nextjs to instrument App Router client-side navigations.
// Without this export, the SDK logs an ACTION REQUIRED warning on every page load.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/#react-router-instrumentation
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
