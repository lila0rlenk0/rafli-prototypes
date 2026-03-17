# Observability: Sentry Error Monitoring

## What Gets Tracked

Only **unexpected** errors reach Sentry. Expected errors (wrong password, sold out, permission denied, validation) are dropped by `beforeSend` in `src/lib/sentry/filter.ts`.

- **Reported**: `internal_server_error`, `service_unavailable`, `unknown_error`, payment processing failures, unhandled exceptions
- **Dropped**: All codes in `EXPECTED_ERROR_CODES` set (business rules, user mistakes, validation)
- **Sampled (10%)**: `network_error`, `timeout_error`, `connection_aborted` — fingerprinted into one group
- **Dropped**: Browser noise (ResizeObserver, ChunkLoadError, extension errors)

## Adding Monitoring to a New Service

Add `captureServiceError` in the catch block, before `return failure()`:

```typescript
import { captureServiceError } from '@/lib/sentry/capture';

// In catch block:
const errorCode = mapDomainError(error);
captureServiceError(error, errorCode, {
  service: 'domain-name',
  action: 'action-name',
});
return failure(errorCode);
```

`beforeSend` handles classification automatically — no need to check if the error is expected.

## Adding a New Expected Error Code

Add the code string to `EXPECTED_ERROR_CODES` set in `src/lib/sentry/filter.ts`. This prevents it from reaching Sentry.

## Adding a New Unexpected Error Code

No filter changes needed. Just call `captureServiceError` — codes not in `EXPECTED_ERROR_CODES` pass through by default.

## Sentry vs Mixpanel

- **Sentry**: System errors, stack traces, alerting, deduplication
- **Mixpanel**: Business analytics events (sign_in_completed, purchase_completed, etc.)

## Config Files

- `sentry.client.config.ts` — Browser SDK init
- `sentry.server.config.ts` — Node SDK init
- `sentry.edge.config.ts` — Edge runtime init
- `instrumentation.ts` — Next.js instrumentation hook
- `src/lib/sentry/filter.ts` — `beforeSend` filter
- `src/lib/sentry/capture.ts` — `captureServiceError` helper

## Environment Variables

- `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` — DSN (optional, disabled when absent)
- `SENTRY_AUTH_TOKEN` — Source map upload token (CI/deploy only)
- `SENTRY_ORG` / `SENTRY_PROJECT` — Org and project slugs for source maps

## Rules

- Never send PII (emails, passwords, addresses) as Sentry context
- Never capture expected user errors — add to `EXPECTED_ERROR_CODES` instead
- Always verify new error codes are correctly classified before deploying
