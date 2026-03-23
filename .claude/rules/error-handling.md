# Error Handling and Observability

## ServiceResponse Pattern

All services return a discriminated union defined in `@/types/service-response`:

```typescript
type ServiceResponse<T, E> =
	| { success: true; data: T }
	| { success: false; error: E };
```

Helpers in `@/lib/errors`:

```typescript
return success(data); // success with data
return success(undefined); // success without data (void operations)
return failure(ERROR_CODES.X); // failure with typed error code
```

Never throw raw errors. Always map through `ServiceResponse`.

## Error Mappers

One mapper per domain in `@/lib/errors/error-mapper`. Available: `mapAuthError`, `mapRaffleError`, `mapOrderError`, `mapWalletError`, `mapPaymentError`, `mapTicketError`, `mapHostError`, `mapWinningError`, `mapUpdateError`, `mapVerificationError`, `mapNotificationError`, `mapReviewError`, `mapCommentError`, `mapReportError`, `mapPromoCodeError`.

Auto-mapped codes: 401 `unauthorized`, 403 `forbidden`, 500 `internal_server_error`, `ECONNABORTED` `timeout_error`, `ERR_NETWORK` `network_error`.

## Sentry Integration

`captureServiceError()` from `@/lib/sentry/capture` — required in critical services (auth, payments, crypto). Optional for simple CRUD where error mappers provide enough context.

```typescript
const errorCode = mapDomainError(error);
captureServiceError(error, errorCode, {
	service: 'domain-name',
	action: 'action-name',
});
return failure(errorCode);
```

`beforeSend` in `src/lib/sentry/filter.ts` classifies automatically — no need to check if the error is expected. Expected errors (wrong password, sold out, validation) are dropped. Network/timeout errors are sampled at 10%.

To add a new expected error code, add the string to `EXPECTED_ERROR_CODES` set in `src/lib/sentry/filter.ts`.

## Component Error Handling

Map error codes to user-facing messages with a switch. Use early return pattern.

```typescript
const result = await signIn(data);
if (!result.success) {
	setError('root', { message: getErrorMessage(result.error) });
	return;
}
// TypeScript narrows: result.data exists here
```
