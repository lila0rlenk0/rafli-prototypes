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

## Checklist

- [ ] `'use server'` at top
- [ ] JSDoc with `@returns`
- [ ] Response type defined
- [ ] Zod validation on response
- [ ] ZodError handled separately
- [ ] Appropriate client (base vs authenticated)
- [ ] Appropriate error mapper used
