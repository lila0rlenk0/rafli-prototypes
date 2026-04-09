---
paths:
  - 'src/services/**'
---

# Services

Server actions for all API communication. One action per file, kebab-case.

## API Clients

- `baseClient` — server-only, public, S2S secret, no auth
- `authenticatedClient` — server-only, protected, S2S + Bearer JWT
- `browserClient` — browser-only, OAuth flows, `withCredentials: true`

Server clients from `@/lib/api/client`. Retry: GET/HEAD only on network errors, max 1. Mutations never retried. `createRequest()` for custom timeout.

## Server Action Pattern

```ts
'use server';
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
    captureServiceError(error, errorCode, { service: 'domain', action: 'getData' });
    return failure(errorCode);
  }
}
```

## Validation

- `safeParse` for input (early return on failure), `.parse()` for responses (throws into catch)

## React Query Hooks

Alongside actions. File: `use-<action>.ts`, marked `'use client'`. Keys: `[domain, scope, ...params]`. Mutations invalidate with domain prefix. `serviceError()` bridges ServiceResponse to React Query. `placeholderData: keepPreviousData` for pagination.

## Non-Blocking Side Effects

`after()` from `next/server` for analytics, audit logging, cache invalidation. Never `await` analytics on success path — use `after(() => ...)` or `void`.

## When to Use What

- query hook — client needs cached data, pagination, on-demand fetch
- mutation hook — loading/error states + cache invalidation
- direct action + `useTransition` — form submissions, one-off actions
- direct action in server component — SSR data fetching
