# Services Layer

Server actions for all API requests. Organized by domain (auth, raffle).

## Golden Rules

CRITICAL: All API requests MUST be server actions
NEVER: Expose API keys or tokens to client
ALWAYS: Return `ServiceResponse<TData, TErrorCode>`
ALWAYS: Validate responses with Zod schemas
ALWAYS: Use `success()` and `failure()` helpers

## Clients

- `baseClient` - public endpoints, supports caching
- `authenticatedClient` - auth endpoints, no caching (uses cookies)

## Caching

| Endpoint | Auth | Cache | Client |
|----------|------|-------|--------|
| GET public | None | Yes | baseClient |
| GET auth | Required | No | authenticatedClient |
| POST/PUT/DELETE | Any | No | Either |

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

## Pattern: Public Cached Endpoint

```tsx
'use server';

import { baseClient } from '@/lib/api/client';

export async function getPublicData(): Promise<GetPublicDataResponse> {
  'use cache';

  try {
    const response = await baseClient.get('/public/data', {
      next: { tags: ['public-data'], revalidate: 60 },
    });
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
