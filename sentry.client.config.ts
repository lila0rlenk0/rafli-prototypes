import * as Sentry from '@sentry/nextjs';

import { filterEvent } from '@/lib/sentry/filter';

Sentry.init({
	dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
	enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

	// Errors only — no performance tracing
	tracesSampleRate: 0,

	beforeSend: filterEvent,
});
