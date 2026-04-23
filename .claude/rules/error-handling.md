---
paths:
  - 'src/services/**/*.ts'
  - 'src/lib/errors/**/*.ts'
  - 'src/lib/sentry/**/*.ts'
  - 'src/components/**/*.tsx'
---

# Error Handling

## ServiceResponse

Discriminated union in `@/types/service-response`:

```ts
type ServiceResponse<T, E> =
	| { success: true; data: T }
	| { success: false; error: E };
```

Helpers: `success(data)`, `success(undefined)` for void ops, `failure(ERROR_CODES.X)`. Never throw raw errors from a server action.

## Error mappers

One per domain in `@/lib/errors/error-mapper`: `mapAuthError`, `mapRaffleError`, `mapOrderError`, `mapWalletError`, `mapPaymentError`, `mapTicketError`, `mapHostError`, `mapWinningError`, `mapUpdateError`, `mapVerificationError`, `mapNotificationError`, `mapReviewError`, `mapCommentError`, `mapReportError`, `mapPromoCodeError`.

Auto-mapped by the base mapper:

- 401 → `unauthorized`
- 403 → `forbidden`
- 500 → `internal_server_error`
- `ECONNABORTED` → `timeout_error`
- `ERR_NETWORK` → `network_error`

## Contract drift

Zod `.parse()` on responses surfaces backend drift. Catch `ZodError` and call `captureContractDrift(error, domain, action)` — returns `COMMON_ERROR_CODES.VALIDATION_ERROR`.

## Sentry

- `captureServiceError()` from `@/lib/sentry/capture` — required for critical services (auth, payments, crypto, wallet), optional for simple CRUD
- `beforeSend` in `src/lib/sentry/filter.ts` auto-classifies: expected errors dropped, network/timeout sampled 10%
- add new expected codes to `EXPECTED_ERROR_CODES` in `src/lib/sentry/expected-error-codes.ts`

## Component error handling

- map error codes to user messages via a `switch` — exhaustiveness check with `default: never`
- early return on `result.success === false`; TypeScript narrows `result.data` on the happy path
- never display raw error codes — always translate to user-facing copy
- validation errors render inline (field-level), everything else surfaces via toast or error boundary
