---
paths:
  - 'src/services/**'
---

# Services

Server actions for all external API communication. One action per file, kebab-case naming.

## API Clients

- `baseClient` — server-only, public endpoints, S2S secret, no auth token
- `authenticatedClient` — server-only, protected endpoints, S2S secret + Bearer JWT
- `browserClient` — browser-only, OAuth flows, `withCredentials: true`, no S2S. File: `@/lib/api/client-browser`

Both server clients from `@/lib/api/client`. Retry: only GET/HEAD on network errors, max 1 retry. Mutations never retried. `createRequest()` for custom timeout.

## Server Action Pattern

```tsx
'use server';

import { authenticatedClient } from '@/lib/api/client';
import { failure, mapRaffleError, success } from '@/lib/errors';
import type { ServiceResponse } from '@/types/service-response';
import { ZodError } from 'zod';

/** @returns ServiceResponse with data or error code */
export async function getData(): Promise<ServiceResponse<MyType, MyErrorCode>> {
	try {
		const response = await authenticatedClient.get('/endpoint');
		return success(mySchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('Validation failed:', error);
			return failure(COMMON_ERROR_CODES.VALIDATION_ERROR);
		}
		const errorCode = mapRaffleError(error);
		captureServiceError(error, errorCode, {
			service: 'domain',
			action: 'getData',
		});
		return failure(errorCode);
	}
}
```

## Validation

- `safeParse` for input validation (early return on failure)
- `.parse()` for response validation (throws into catch block)

## File Upload

Validate type/size before sending. Use `FormData`. Pass `'Content-Type': 'multipart/form-data'`.

## React Query Hooks

Hooks live alongside server actions. File: `use-<action>.ts`. Mark `'use client'`.

- Query keys: `[domain, scope, ...params]`
- Mutations invalidate using domain prefix `['domain']`
- `serviceError()` from `@/lib/query/errors` bridges ServiceResponse errors to React Query
- `placeholderData: keepPreviousData` for paginated queries

```tsx
'use client';

export function useMyData(options?: { limit?: number; enabled?: boolean }) {
	return useQuery<MyResponse, ServiceError<MyErrorCode>>({
		queryKey: ['my-domain', 'list', { limit: options?.limit }],
		queryFn: async function fetchMyData() {
			const result = await getMyData({ limit: options?.limit });
			if (!result.success) throw serviceError(result.error);
			return result.data;
		},
		enabled: options?.enabled ?? true,
	});
}
```

## Non-Blocking Side Effects

`after()` from `next/server` for work that shouldn't block the response — analytics, audit logging, cache invalidation.

## When to Use What

- React Query query hook — client component needs cached data, pagination, on-demand fetching
- React Query mutation hook — client component needs loading/error states + cache invalidation
- Direct server action + `useTransition` — form submissions, one-off actions
- Direct server action in server component — SSR data fetching
