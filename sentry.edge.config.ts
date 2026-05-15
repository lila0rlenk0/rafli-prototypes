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

	// Vercel-edge runtime gates `requestDataIntegration` behind `sendDefaultPii`
	// (see @sentry/vercel-edge index.js:5189). Without it, `event.request` is
	// `undefined` on edge and `attachVercelIdTag` silently no-ops. Register
	// the integration explicitly with `include.ip: false` so request headers
	// (including `x-vercel-id`) are captured WITHOUT enabling client IP
	// collection. The Node runtime auto-includes this integration; this line
	// brings the edge runtime to parity.
	integrations: defaults => [
		...defaults,
		Sentry.requestDataIntegration({ include: { ip: false } }),
	],
});

Sentry.getGlobalScope().addEventProcessor(attachVercelIdTag);
