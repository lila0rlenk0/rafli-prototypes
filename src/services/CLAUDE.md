# Services Layer

Server actions for all external API communication. Organized by domain.

## Directory Structure

```
services/
├── auth/      # Authentication (sign-in, register, password)
├── user/      # User profile management
├── raffle/    # Raffle CRUD and queries
├── ticket/    # Ticket purchases and listings
├── order/     # Order management
├── payment/   # Payment session handling
├── host/      # Host profiles
├── update/    # Raffle updates/announcements
└── winning/   # Winner management
```

## Golden Rules

CRITICAL: All API requests MUST be server actions (`'use server'`)
NEVER: Expose API keys or tokens to client
ALWAYS: Return `ServiceResponse<TData, TErrorCode>`
ALWAYS: Validate responses with Zod schemas
ALWAYS: Use `success()` and `failure()` helpers
ALWAYS: Handle `ZodError` separately from API errors
ALWAYS: JSDoc with `@returns` on all functions

## Conventions

- One action per file (e.g., `get-raffle.ts`, `create-raffle.ts`)
- File names match action names in kebab-case
- Group related actions in domain folders
- Use appropriate error mapper per domain (`mapAuthError`, `mapRaffleError`)

## API Clients

| Client                | Use Case                               |
| --------------------- | -------------------------------------- |
| `baseClient`          | Public endpoints (no auth required)    |
| `authenticatedClient` | Protected endpoints (requires session) |

Both clients auto-inject: S2S secret, client IP headers.

## How To: Authenticated Action

```tsx
'use server';

import { authenticatedClient } from '@/lib/api/client';
import { failure, success } from '@/lib/errors';
import { mapRaffleError } from '@/lib/errors';
import type { ServiceResponse } from '@/types/service-response';
import { ZodError } from 'zod';

/**
 * Fetches entity data
 * @returns ServiceResponse with data or error code
 */
export async function getData(): Promise<ServiceResponse<MyType, MyErrorCode>> {
	try {
		const response = await authenticatedClient.get('/endpoint');
		const validated = mySchema.parse(response.data);
		return success(validated);
	} catch (error) {
		if (error instanceof ZodError) {
			console.error('Validation failed:', error);
			return failure(ERROR_CODES.VALIDATION_FAILED);
		}
		return failure(mapRaffleError(error));
	}
}
```

## How To: Public Action

```tsx
'use server';

import { baseClient } from '@/lib/api/client';
import { failure, success } from '@/lib/errors';
import { mapRaffleError } from '@/lib/errors';

/**
 * Fetches public data
 * @returns ServiceResponse with data or error code
 */
export async function getPublicData(): Promise<
	ServiceResponse<MyType, MyErrorCode>
> {
	try {
		const response = await baseClient.get('/public-endpoint');
		return success(mySchema.parse(response.data));
	} catch (error) {
		return failure(mapRaffleError(error));
	}
}
```

## How To: File Upload

```tsx
export async function uploadFile(
	file: File,
): Promise<ServiceResponse<UploadResult, UploadErrorCode>> {
	try {
		// Validate before sending
		if (!ACCEPTED_TYPES.includes(file.type)) {
			return failure(ERROR_CODES.INVALID_FILE_TYPE);
		}
		if (file.size > MAX_SIZE) {
			return failure(ERROR_CODES.FILE_TOO_LARGE);
		}

		const formData = new FormData();
		formData.append('file', file);

		const response = await authenticatedClient.post('/upload', formData, {
			headers: { 'Content-Type': 'multipart/form-data' },
		});
		return success(uploadSchema.parse(response.data));
	} catch (error) {
		return failure(mapError(error));
	}
}
```

## React Query Hooks (Client-Side)

Hooks live alongside server actions in the same domain folder.
They wrap server actions for client components that need caching, pagination, or mutation states.

ALWAYS: `'use client'` directive at top
ALWAYS: File name `use-<action>.ts` (e.g., `use-notifications.ts`)
ALWAYS: JSDoc on exported hook
ALWAYS: Use `serviceError()` from `@/lib/query/errors` to bridge errors
ALWAYS: Query keys follow `[domain, scope, ...params]` convention
ALWAYS: Mutations invalidate using domain prefix `['domain']`
NEVER: Use hooks for one-off actions (form submissions with `useTransition` are fine as-is)
NEVER: Use hooks for server-only data fetching (server components fetch directly)

### How To: Query Hook

```tsx
'use client';

import { useQuery } from '@tanstack/react-query';

import { serviceError, type ServiceError } from '@/lib/query/errors';
import type { MyErrorCode } from '@/types/errors';
import type { MyResponse } from '@/types/my-domain';

import { getMyData } from './get-my-data';

/** Query key for my data */
export function myDataKey(params?: { limit?: number }) {
	return ['my-domain', 'list', params] as const;
}

/**
 * Query hook for fetching my data
 * @param options - Query options
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

### How To: Query Hook with Pagination

```tsx
import { keepPreviousData, useQuery } from '@tanstack/react-query';

export function useMyPaginatedData(params: { limit: number; offset: number }) {
	return useQuery<MyResponse, ServiceError<MyErrorCode>>({
		queryKey: ['my-domain', 'list', params],
		queryFn: async function fetchData() {
			const result = await getData(params);
			if (!result.success) throw serviceError(result.error);
			return result.data;
		},
		placeholderData: keepPreviousData,
	});
}
```

### How To: Mutation Hook

```tsx
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { serviceError, type ServiceError } from '@/lib/query/errors';

import { createMyData } from './create-my-data';

/**
 * Mutation hook for creating my data
 * Invalidates all my-domain queries on success
 * @returns React Query mutation result
 */
export function useCreateMyData() {
	const queryClient = useQueryClient();

	return useMutation<ResponseType, ServiceError<MyErrorCode>, PayloadType>({
		mutationFn: async function create(payload) {
			const result = await createMyData(payload);
			if (!result.success) throw serviceError(result.error);
			return result.data;
		},
		onSuccess() {
			queryClient.invalidateQueries({ queryKey: ['my-domain'] });
		},
	});
}
```

### When to use React Query hooks vs direct server actions

| Pattern | Use Case |
|---------|----------|
| React Query query hook | Client component needs cached data, pagination, or on-demand fetching |
| React Query mutation hook | Client component needs loading/error states + cache invalidation |
| Direct server action + `useTransition` | Form submissions (react-hook-form), one-off actions |
| Direct server action (server component) | Server-side data fetching, SSR |

## Server Action Checklist

- [ ] `'use server'` at top
- [ ] JSDoc with `@returns`
- [ ] Response type defined
- [ ] Zod validation on response
- [ ] ZodError handled separately
- [ ] Appropriate client (base vs authenticated)
- [ ] Appropriate error mapper used

## React Query Hook Checklist

- [ ] `'use client'` at top
- [ ] File named `use-<action>.ts`
- [ ] JSDoc on exported hook
- [ ] Uses `serviceError()` for error bridging
- [ ] Query key exported as named function
- [ ] Mutations invalidate domain prefix
