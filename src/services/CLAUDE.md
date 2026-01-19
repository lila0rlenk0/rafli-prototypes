# Services Layer

Server actions for all API requests. Organized by domain (auth, raffle).

## Golden Rules

CRITICAL: All API requests MUST be server actions
NEVER: Expose API keys or tokens to client
ALWAYS: Return `ServiceResponse<TData, TErrorCode>`
ALWAYS: Validate responses with Zod schemas
ALWAYS: Use `success()` and `failure()` helpers

## Clients

- `baseClient` - public endpoints (injects S2S secret + client IP)
- `authenticatedClient` - auth endpoints (injects token + S2S secret + client IP)

## Usage Guide

| Endpoint | Auth | Client |
|----------|------|--------|
| GET public | None | baseClient |
| GET auth | Required | authenticatedClient |
| POST/PUT/DELETE public | None | baseClient |
| POST/PUT/DELETE auth | Required | authenticatedClient |

## Pattern: Authenticated Endpoint

```tsx
'use server';

import { authenticatedClient } from '@/lib/api/client';
import { failure, success } from '@/lib/errors';
import { mapRaffleError } from '@/lib/errors';
import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import { mySchema, type MyResponse } from '@/types/my-entity';
import type { ServiceResponse } from '@/types/service-response';
import { ZodError } from 'zod';

type GetMyDataResponse = ServiceResponse<MyResponse, RaffleErrorCode>;

/**
 * Fetches user data (JSDoc required)
 * @returns ServiceResponse with data or error code
 */
export async function getMyData(): Promise<GetMyDataResponse> {
  try {
    const response = await authenticatedClient.get('/me/data');
    const validated = mySchema.parse(response.data);
    return success(validated);
  } catch (error) {
    if (error instanceof ZodError) {
      console.error('Validation failed:', error);
      return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
    }
    return failure(mapRaffleError(error));
  }
}
```

## Pattern: Public Endpoint

```tsx
'use server';

import { baseClient } from '@/lib/api/client';
import { failure, success } from '@/lib/errors';
import { mapRaffleError } from '@/lib/errors';

export async function getPublicData(): Promise<GetPublicDataResponse> {
  try {
    const response = await baseClient.get('/public/data');
    return success(response.data);
  } catch (error) {
    return failure(mapRaffleError(error));
  }
}
```

## Pattern: File Upload

```tsx
export async function uploadFile(file: File): Promise<UploadResponse> {
  try {
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

- [ ] 'use server' at top
- [ ] JSDoc with @returns
- [ ] Response type defined
- [ ] Zod validation on response
- [ ] ZodError handled separately
- [ ] Appropriate error mapper used
