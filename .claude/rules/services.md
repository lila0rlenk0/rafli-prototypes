---
paths:
  - 'src/services/**'
---

# Services

Server actions for all external API communication. One action per file, kebab-case naming.

## Domain Folders

`auth/`, `user/`, `raffle/`, `ticket/`, `order/`, `payment/`, `host/`, `update/`, `winning/`, `comment/`, `notification/`, `promo-code/`, `report/`, `review/`, `verification/`, `wallet/`

## API Clients

- `baseClient` — server-only, public endpoints, S2S secret, no auth token
- `authenticatedClient` — server-only, protected endpoints, S2S secret + Bearer JWT
- `browserClient` — browser-only, OAuth flows, `withCredentials: true`, no S2S. Separate file: `@/lib/api/client-browser`

Both server clients from `@/lib/api/client`. Retry logic: only GET/HEAD on `ECONNABORTED`/`ERR_NETWORK`/`ETIMEDOUT`, max 1 retry. Mutations never retried. Use `createRequest()` for custom timeout (e.g., `API_TIMEOUTS.UPLOAD` for 30s uploads).

## Server Action Pattern

```tsx
'use server';

import { authenticatedClient } from '@/lib/api/client';
import { failure, mapRaffleError, success } from '@/lib/errors';
import { captureServiceError } from '@/lib/sentry/capture';
import type { ServiceResponse } from '@/types/service-response';
import { ZodError } from 'zod';

/**
 * Fetches entity data
 * @returns ServiceResponse with data or error code
 */
export async function getData(): Promise<ServiceResponse<MyType, MyErrorCode>> {
	try {
		const response = await authenticatedClient.get('/endpoint');
		// Response validation — .parse() so ZodError is caught below
		const validated = mySchema.parse(response.data);
		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('Validation failed:', error);
			return failure(COMMON_ERROR_CODES.VALIDATION_ERROR);
		}
		const errorCode = mapRaffleError(error);
		// captureServiceError — required for critical services (auth, payments, crypto)
		// Optional for simple CRUD where error mappers provide enough context
		captureServiceError(error, errorCode, {
			service: 'domain-name',
			action: 'action-name',
		});
		return failure(errorCode);
	}
}
```

## Input Validation

Use `safeParse` for input validation (early return). Use `.parse()` for response validation (throw into catch).

```tsx
const validationResult = createInputSchema.safeParse(input);
if (!validationResult.success) {
	return failure(COMMON_ERROR_CODES.VALIDATION_ERROR);
}
const response = await authenticatedClient.post(
	'/endpoint',
	validationResult.data,
);
return success(entitySchema.parse(response.data));
```

## File Upload

Validate type/size before sending. Use `FormData`. Pass `'Content-Type': 'multipart/form-data'` header.

## React Query Hooks

Hooks live alongside server actions in domain folders. File name: `use-<action>.ts`. Mark `'use client'`.

```tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { serviceError, type ServiceError } from '@/lib/query/errors';

export function myDataKey(params?: { limit?: number }) {
	return ['my-domain', 'list', params] as const;
}

/**
 * Query hook for fetching my data
 * @returns React Query result
 */
export function useMyData(options?: { limit?: number; enabled?: boolean }) {
	return useQuery<MyResponse, ServiceError<MyErrorCode>>({
		queryKey: myDataKey({ limit: options?.limit }),
		queryFn: async function fetchMyData() {
			const result = await getMyData({ limit: options?.limit });
			if (!result.success) throw serviceError(result.error);
			return result.data;
		},
		enabled: options?.enabled ?? true,
	});
}
```

- Query keys: `[domain, scope, ...params]`
- Mutations invalidate using domain prefix `['domain']`
- Use `serviceError()` from `@/lib/query/errors` to bridge errors
- Use `placeholderData: keepPreviousData` (imported from `@tanstack/react-query`) for paginated queries

## Non-Blocking Side Effects

Use `after()` from `next/server` for work that shouldn't block the response — analytics, audit logging, cache invalidation.

```tsx
import { after } from 'next/server';

export async function createRaffle(data: CreateInput) {
	const result = await authenticatedClient.post('/raffles', data);
	// Log after response is sent — doesn't block the user
	after(async () => {
		await trackEvent('raffle_created', { id: result.data.id });
	});
	return success(raffleSchema.parse(result.data));
}
```

## When to Use What

- React Query query hook — client component needs cached data, pagination, on-demand fetching
- React Query mutation hook — client component needs loading/error states + cache invalidation
- Direct server action + `useTransition` — form submissions, one-off actions
- Direct server action in server component — SSR data fetching
