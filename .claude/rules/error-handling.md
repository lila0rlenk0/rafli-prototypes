# Error Handling

## ServiceResponse

Discriminated union in `@/types/service-response`:

```ts
type ServiceResponse<T, E> = { success: true; data: T } | { success: false; error: E };
```

Helpers: `success(data)`, `success(undefined)` for void ops, `failure(ERROR_CODES.X)`. Never throw raw errors.

## Error Mappers

One per domain in `@/lib/errors/error-mapper`: `mapAuthError`, `mapRaffleError`, `mapOrderError`, `mapWalletError`, `mapPaymentError`, `mapTicketError`, `mapHostError`, `mapWinningError`, `mapUpdateError`, `mapVerificationError`, `mapNotificationError`, `mapReviewError`, `mapCommentError`, `mapReportError`, `mapPromoCodeError`.

Auto-mapped: 401 `unauthorized`, 403 `forbidden`, 500 `internal_server_error`, `ECONNABORTED` `timeout_error`, `ERR_NETWORK` `network_error`.

## Sentry

`captureServiceError()` from `@/lib/sentry/capture` — required for critical services (auth, payments, crypto), optional for simple CRUD.

`beforeSend` in `src/lib/sentry/filter.ts` auto-classifies. Expected errors dropped, network/timeout sampled 10%. Add new expected codes to `EXPECTED_ERROR_CODES` set.

## Component Error Handling

Map error codes to messages with switch. Early return on failure, TypeScript narrows `result.data` on success path.
