---
paths:
  - 'src/services/**/*.ts'
---

# Services

Server actions for all API communication. One action per file, kebab-case. Grouped by domain: `auth`, `raffle`, `host`, `order`, `payment`, `ticket`, `wallet`, `winning`, `verification`, `notification`, `review`, `comment`, `report`, `promo-code`, `update`, `kyc-submission`, `admin-kyc`, `subscription`, `user`, `chat`.

## API clients

- `baseClient` — server-only, public endpoints, S2S secret, no auth
- `authenticatedClient` — server-only, protected endpoints, S2S + Bearer JWT
- `browserClient` — browser-only, OAuth flows, `withCredentials: true`

Retry: GET/HEAD only, network errors, max 1. Mutations never retried. Use `createRequest()` for custom timeouts.

## Server action template

```ts
'use server';

// 1. validate input (safeParse for UX feedback — backend is authoritative)
// 2. delegate to the client (auth re-verified by backend)
// 3. parse response (contract drift surfaced to Sentry)
// 4. map + capture errors
// 5. return ServiceResponse — never throw
export async function getData(): Promise<ServiceResponse<MyType, MyErrorCode>> {
	try {
		const response = await authenticatedClient.get('/endpoint');
		return success(mySchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'domain', 'getData');
			return failure(COMMON_ERROR_CODES.VALIDATION_ERROR);
		}
		const errorCode = mapDomainError(error);
		captureServiceError(error, errorCode, {
			service: 'domain',
			action: 'getData',
		});
		return failure(errorCode);
	}
}
```

## Validation

- `safeParse` for input — early return on failure with validation error code
- `.parse()` for API responses — throws into the `ZodError` branch above

## React Query hooks

Live alongside actions. File: `use-<action>.ts`, marked `'use client'`.

- keys: `[domain, scope, ...params]` — domain prefix first
- mutations invalidate with the domain prefix
- `serviceError()` from `@/lib/query` bridges `ServiceResponse` to React Query error state
- `placeholderData: keepPreviousData` for pagination

## Non-blocking side effects

`after()` from `next/server` for analytics, audit logging, cache invalidation. Never `await` analytics on the success path — use `after(() => ...)` or `void`.

## When to use what

- **query hook** — client needs cached data, pagination, on-demand fetch
- **mutation hook** — loading/error states + cache invalidation
- **direct action + `useTransition`** — form submissions, one-off actions
- **direct action in server component** — SSR data fetching

## Forbidden

- throwing from a server action — return `failure(code)`
- exposing raw Axios errors to the caller
- retrying mutations
- unauthenticated calls to `authenticatedClient`
