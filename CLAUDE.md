# Project Development Guidelines

This document contains important guidelines and best practices for developing features in this project. Please follow these guidelines to maintain code quality, security, and consistency.

## API Requests and Server Actions

### Service Layer Architecture
- **All API requests must be implemented as server actions** located in `@src/services/`
- The services folder is organized by different service domains (e.g., `auth`, `raffle`)
- Each service should contain related request functions grouped together

### Why Server Actions?
Server actions provide several critical benefits:
1. **Security**: Prevents exposure of API keys, authentication tokens, and API routes to the client
2. **Server-side features**: Enables use of server-only features like cookies and secure environment variables
3. **Performance**: Reduces client bundle size and improves initial page load
4. **Type safety**: Better integration with TypeScript and server-side validation

### Client-side Requests (Edge Cases Only)
- Client-side request functions should only be created in exceptional edge cases
- If you need to create a client-side function, document the reasoning clearly
- Always consider security implications before exposing any client-side request logic

### Caching with Next.js 16 'use cache'

#### The Limitation
Next.js 16's `'use cache'` directive **cannot access dynamic data sources** like `cookies()`, `headers()`, or `searchParams`. Since our authentication uses cookies to store the Bearer token, we cannot use caching for authenticated endpoints.

#### Simplified Cache Strategy

To keep the architecture simple and maintainable:

**✅ Use cache for:**
- Public GET endpoints (no authentication required)
- Static or semi-static data that doesn't require user context
- Examples: public raffle listings, categories, public profiles

**❌ Don't use cache for:**
- Any authenticated endpoints (requires cookies for token)
- Mutations (POST, PUT, PATCH, DELETE)
- User-specific data
- Real-time or frequently changing data

#### Pattern for Public Cached Endpoints

```tsx
'use server';

import { baseClient } from '@/lib/api/client';
import { failure, success } from '@/lib/errors';
import { mapRaffleError } from '@/lib/errors';
import { type RaffleErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';

type GetPublicRafflesResponse = ServiceResponse<Raffle[], RaffleErrorCode>;

/**
 * Fetches public raffles with caching
 */
export async function getPublicRaffles(
  params?: QueryParams
): Promise<GetPublicRafflesResponse> {
  'use cache';

  try {
    // Use baseClient (no authentication)
    const response = await baseClient.get('/public/raffles', {
      params,
      next: {
        tags: ['public-raffles'],
        revalidate: 60, // Cache for 60 seconds
      },
    });

    return success(response.data);
  } catch (error) {
    const errorCode = mapRaffleError(error);
    return failure(errorCode);
  }
}
```

#### Pattern for Authenticated Endpoints (No Cache)

```tsx
'use server';

import { authenticatedClient } from '@/lib/api/client';
import { failure, success } from '@/lib/errors';
import { mapRaffleError } from '@/lib/errors';
import { RAFFLE_ERROR_CODES, type RaffleErrorCode } from '@/types/errors';
import { listRafflesResponseSchema, type ListRafflesResponse } from '@/types/raffle';
import type { ServiceResponse } from '@/types/service-response';
import { ZodError } from 'zod';

type GetMyRafflesResponse = ServiceResponse<ListRafflesResponse, RaffleErrorCode>;

/**
 * Fetches user's raffles
 * No caching because it requires authentication (cookies)
 */
export async function getMyRaffles(
  query?: QueryParams
): Promise<GetMyRafflesResponse> {
  try {
    // authenticatedClient handles token injection via interceptor
    const response = await authenticatedClient.get('/me/raffles', {
      params: query,
    });

    // Validate response with Zod schema
    const validatedData = listRafflesResponseSchema.parse(response.data);

    return success(validatedData);
  } catch (error) {
    // Handle validation errors separately
    if (error instanceof ZodError) {
      console.error('Response validation failed:', error);
      return failure(RAFFLE_ERROR_CODES.FETCH_FAILED);
    }

    const errorCode = mapRaffleError(error);
    return failure(errorCode);
  }
}
```

#### Quick Reference

| Endpoint Type | Authentication | Use Cache? | Client Type |
|---------------|----------------|------------|-------------|
| GET (public) | None | ✅ Yes | `baseClient` |
| GET (authenticated) | Required | ❌ No | `authenticatedClient` |
| POST/PUT/DELETE | Any | ❌ No | `baseClient` or `authenticatedClient` |

**Rationale:**
- Keeps architecture simple and predictable
- Avoids complex wrapper patterns
- Clear separation: public data can be cached, authenticated data cannot
- No risk of cache-related authentication bugs

### Creating New Server Actions

**All server actions must follow the typed error response pattern** using `success()` and `failure()` helpers.

#### Step-by-Step Guide

**1. Define imports:**
```tsx
'use server';

import { baseClient } from '@/lib/api/client'; // or authenticatedClient
import { failure, success } from '@/lib/errors';
import { mapAuthError } from '@/lib/errors'; // or mapRaffleError
import { AUTH_ERROR_CODES, type AuthErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';
```

**2. Define response type:**
```tsx
// For GET requests returning data
type GetUserResponse = ServiceResponse<User, AuthErrorCode>;

// For POST/PUT/DELETE returning data
type CreateUserResponse = ServiceResponse<User, AuthErrorCode>;

// For operations with no return data (e.g., sign-out, delete)
type DeleteUserResponse = ServiceResponse<void, AuthErrorCode>;
```

**3. Implement function with proper error handling:**
```tsx
/**
 * JSDoc describing what the function does
 *
 * @param input - Description of parameters
 * @returns ServiceResponse with data on success, ErrorCode on failure
 */
export async function myServiceAction(
  input: MyInput
): Promise<MyServiceResponse> {
  try {
    // Step 1: Client-side validation (if needed)
    if (!isValid(input)) {
      return failure(MY_ERROR_CODES.INVALID_INPUT);
    }

    // Step 2: Make API request
    const response = await baseClient.post('/endpoint', input);

    // Step 3: Validate response structure (with Zod if available)
    const validatedData = mySchema.parse(response.data);

    // Step 4: Return success with data
    return success(validatedData);
  } catch (error) {
    // Handle Zod validation errors separately
    if (error instanceof ZodError) {
      console.error('Response validation failed:', error);
      return failure(MY_ERROR_CODES.VALIDATION_FAILED);
    }

    // Map backend errors to frontend error codes
    const errorCode = mapMyError(error);
    return failure(errorCode);
  }
}
```

#### Common Patterns

**Pattern 1: Simple GET request**
```tsx
export async function getItem(id: string): Promise<ServiceResponse<Item, ItemErrorCode>> {
  try {
    const response = await baseClient.get(`/items/${id}`);
    const validated = itemSchema.parse(response.data);
    return success(validated);
  } catch (error) {
    if (error instanceof ZodError) {
      return failure(ITEM_ERROR_CODES.FETCH_FAILED);
    }
    return failure(mapItemError(error));
  }
}
```

**Pattern 2: POST with validation**
```tsx
export async function createItem(
  input: CreateItemInput
): Promise<ServiceResponse<Item, ItemErrorCode>> {
  try {
    // Validate input payload
    const validationResult = createItemPayloadSchema.safeParse(input);
    if (!validationResult.success) {
      console.error('Payload validation failed:', validationResult.error);
      return failure(ITEM_ERROR_CODES.INVALID_DATA);
    }

    const response = await authenticatedClient.post('/items', validationResult.data);
    const item = itemSchema.parse(response.data);
    return success(item);
  } catch (error) {
    if (error instanceof ZodError) {
      return failure(ITEM_ERROR_CODES.CREATE_FAILED);
    }
    return failure(mapItemError(error));
  }
}
```

**Pattern 3: DELETE with no return data**
```tsx
export async function deleteItem(id: string): Promise<ServiceResponse<void, ItemErrorCode>> {
  try {
    await authenticatedClient.delete(`/items/${id}`);
    return success(undefined);
  } catch (error) {
    return failure(mapItemError(error));
  }
}
```

**Pattern 4: File upload**
```tsx
export async function uploadFile(
  file: File
): Promise<ServiceResponse<UploadResponse, ItemErrorCode>> {
  try {
    // Client-side validation
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return failure(ITEM_ERROR_CODES.INVALID_FILE_TYPE);
    }
    if (file.size > MAX_SIZE) {
      return failure(ITEM_ERROR_CODES.FILE_TOO_LARGE);
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await authenticatedClient.post('/upload', formData, {
      timeout: API_TIMEOUTS.UPLOAD,
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const validated = uploadResponseSchema.parse(response.data);
    return success(validated);
  } catch (error) {
    if (error instanceof ZodError) {
      return failure(ITEM_ERROR_CODES.UPLOAD_FAILED);
    }
    return failure(mapItemError(error));
  }
}
```

#### Key Rules

1. **Always return `ServiceResponse<TData, TErrorCode>`**
2. **Use `success(data)` for successful operations**
3. **Use `failure(errorCode)` for all error cases**
4. **Never return raw error strings** - always use typed error codes
5. **Validate responses with Zod schemas when available**
6. **Handle `ZodError` separately** from API errors
7. **Use appropriate error mapper** (`mapAuthError`, `mapRaffleError`, etc.)
8. **Log validation failures** with `console.error()` for debugging
9. **Return early** for client-side validation failures
10. **Document functions** with JSDoc including `@returns` description

#### Error Code Selection

Choose the appropriate error code based on the failure type:

```tsx
// Client-side validation
if (file.size > MAX_SIZE) {
  return failure(SERVICE_ERROR_CODES.FILE_TOO_LARGE);
}

// Zod validation failure
if (error instanceof ZodError) {
  return failure(SERVICE_ERROR_CODES.VALIDATION_FAILED);
}

// Backend/network errors
const errorCode = mapServiceError(error); // Auto-maps backend codes
return failure(errorCode);
```

#### Quick Reference: success() vs failure()

```tsx
// ✅ SUCCESS CASES
return success(data);              // With data
return success(undefined);         // No data (void)
return success(validatedData);     // After Zod validation
return success(response.data);     // Direct API response

// ❌ FAILURE CASES
return failure(ERROR_CODES.NOT_FOUND);           // Specific error
return failure(mapServiceError(error));          // Mapped backend error
return failure(ERROR_CODES.VALIDATION_FAILED);   // Zod validation failed
return failure(ERROR_CODES.INVALID_INPUT);       // Client validation failed
```

**When to use each:**
- **`success(data)`**: When operation completes successfully with or without data
- **`failure(code)`**: For ANY error - validation, backend, network, or business logic

## Component Development

### 1. Logic Extraction from JSX

**Avoid inline logic in JSX.** Extract calculations, transformations, and data formatting into dedicated functions **defined inside the component**.

❌ **Bad Practice:**
```tsx
export function RaffleCard({ raffle, user }: Props) {
  return (
    <div>{user.name}</div>
    <div>{raffle.maxParticipants.toLocaleString()}</div>
  );
}
```

✅ **Good Practice:**
```tsx
export function RaffleCard({ raffle, user }: Props) {
  /**
   * Gets the display name for the user
   * @param user - The user object
   * @returns The formatted user name
   */
  function getUserDisplayName(user: User): string {
    return user.name || user.email;
  }

  /**
   * Formats a participant count with proper locale string formatting
   * @param count - The number of participants
   * @returns Formatted string with locale-appropriate number formatting
   */
  function formatParticipantCount(count: number): string {
    return count.toLocaleString();
  }

  const userName = getUserDisplayName(user);
  const formattedMaxParticipants = formatParticipantCount(raffle.maxParticipants);

  return (
    <div>{userName}</div>
    <div>{formattedMaxParticipants}</div>
  );
}
```

**Important:** Functions should be defined **inside the component** to:
- Keep related logic close to where it's used
- Access component props and state directly without passing many parameters
- Maintain component encapsulation
- Make the component self-contained and easier to understand

**Benefits:**
- Easier maintenance and debugging
- Simpler testing of logic in isolation
- Better readability and code reusability
- Facilitates future modifications
- Clear separation between logic and presentation

### 2. Documentation Requirements

#### Function Documentation
All functions must include JSDoc comments with:
- Description of what the function does
- Parameter descriptions with types
- Return value description
- Example usage (when helpful)

Example:
```tsx
/**
 * Formats a participant count with proper locale string formatting
 * @param count - The number of participants
 * @returns Formatted string with locale-appropriate number formatting
 */
function formatParticipantCount(count: number): string {
  return count.toLocaleString();
}
```

#### Component Documentation
Every component must have a description at the top explaining its functionality:

```tsx
/**
 * RaffleCard Component
 *
 * Displays a raffle item with its details including title, description,
 * participant count, and action buttons. Handles both active and completed
 * raffle states with different visual treatments.
 */
export function RaffleCard({ raffle }: RaffleCardProps) {
  // component implementation
}
```

### 3. Server Components First

**Always prefer Server Components over Client Components** unless client-side interactivity is required.

When to use Server Components:
- Static content rendering
- Data fetching from databases or APIs
- Content that doesn't need client-side state
- SEO-critical content

When to use Client Components:
- Interactive UI elements (click handlers, form inputs)
- Browser APIs (localStorage, geolocation, etc.)
- Client-side state management
- Real-time features requiring event listeners

Mark client components explicitly:
```tsx
'use client';

export function InteractiveButton() {
  // client component implementation
}
```

#### Loading States for Async Server Components

**When creating async Server Components, always consider the loading state.** Next.js provides two main approaches:

**Option 1: Using Suspense (Recommended for granular loading)**
```tsx
// app/raffles/page.tsx
import { Suspense } from 'react';
import { RaffleList } from '@/components/raffle-list';
import { RaffleListSkeleton } from '@/components/raffle-list-skeleton';

export default function RafflesPage() {
  return (
    <div>
      <h1>Raffles</h1>
      <Suspense fallback={<RaffleListSkeleton />}>
        <RaffleList />
      </Suspense>
    </div>
  );
}

// components/raffle-list.tsx
export async function RaffleList() {
  const raffles = await getRaffles();

  return (
    <div>
      {raffles.map(raffle => (
        <RaffleCard key={raffle.id} raffle={raffle} />
      ))}
    </div>
  );
}
```

**Option 2: Using loading.tsx (Page-level loading)**
```tsx
// app/raffles/loading.tsx
import { RaffleListSkeleton } from '@/components/raffle-list-skeleton';

export default function Loading() {
  return (
    <div>
      <h1>Raffles</h1>
      <RaffleListSkeleton />
    </div>
  );
}

// app/raffles/page.tsx
export default async function RafflesPage() {
  const raffles = await getRaffles();

  return (
    <div>
      <h1>Raffles</h1>
      <div>
        {raffles.map(raffle => (
          <RaffleCard key={raffle.id} raffle={raffle} />
        ))}
      </div>
    </div>
  );
}
```

**When to use each approach:**

Use **Suspense** when:
- You need granular loading states for specific components
- Multiple independent data sources load at different times
- You want to show partial content while other parts load
- You need nested loading boundaries

Use **loading.tsx** when:
- The entire page should show a loading state
- All data loads together
- You want a simpler, more straightforward loading pattern
- The page is a single cohesive unit

**Best Practices:**
- Always provide a meaningful loading skeleton that matches the content structure
- Never let async components render without a loading boundary
- Keep skeleton components visually similar to the actual content
- Consider using the Skeleton component from your UI library for consistency

### 4. Performance Optimization

When creating client-side interactions, always prioritize performance:

- **Memoization**: Use `useMemo` and `useCallback` for expensive calculations and callback stability
- **Lazy loading**: Implement code splitting for heavy components
- **Debouncing/Throttling**: Apply to frequent events (scroll, resize, input)
- **Virtual scrolling**: Use for long lists
- **Image optimization**: Always use Next.js `Image` component
- **Bundle size**: Monitor and minimize client-side JavaScript

Example:
```tsx
'use client';

import { useMemo, useCallback } from 'react';

export function OptimizedComponent({ data }) {
  // Memoize expensive calculations
  const processedData = useMemo(() => {
    return heavyDataProcessing(data);
  }, [data]);

  // Memoize callbacks to prevent unnecessary re-renders
  const handleClick = useCallback(() => {
    // handle click logic
  }, []);

  return <div onClick={handleClick}>{processedData}</div>;
}
```

### 5. Function Declaration Style

**Prefer `function` declarations over arrow functions** for regular functions, unless there's a specific need for arrow functions.

Use `function` declarations for:
- Regular utility functions
- Helper functions
- Component functions
- Service functions
- Any standalone function

❌ **Avoid:**
```tsx
const formatParticipantCount = (count: number): string => {
  return count.toLocaleString();
};

const getUserDisplayName = (user: User) => {
  return user.name || user.email;
};
```

✅ **Prefer:**
```tsx
function formatParticipantCount(count: number): string {
  return count.toLocaleString();
}

function getUserDisplayName(user: User) {
  return user.name || user.email;
}
```

**When to use arrow functions:**
- Inside `useCallback` hooks (required for proper memoization)
- Inside `useMemo` hooks
- Other React hooks that require function references
- Edge cases where lexical `this` binding is needed

Example of appropriate arrow function usage:
```tsx
'use client';

export function Component() {
  // Arrow function required for useCallback
  const handleClick = useCallback(() => {
    // handle logic
  }, []);

  // Arrow function required for useMemo
  const processedData = useMemo(() => {
    return heavyProcessing();
  }, []);

  return <div onClick={handleClick}>{processedData}</div>;
}
```

**Benefits of function declarations:**
- More readable and conventional
- Hoisted, allowing flexible code organization
- Clearer intent and function purpose
- Consistent with React component syntax
- Better stack traces in debugging

## Type Definitions and Schemas

### Schema-First Approach with Zod

**Always define schemas using Zod first, then infer TypeScript types from them.** This ensures runtime validation matches compile-time types.

❌ **Avoid:**
```tsx
// Defining interfaces manually
export interface MyQuery {
  status?: string;
  limit?: number;
  page?: number;
}

export interface MyResponse {
  data: Item[];
  total: number;
}
```

✅ **Prefer:**
```tsx
// Define Zod schemas first
export const myQuerySchema = z.object({
  status: z.string().optional(),
  limit: z.number().optional(),
  page: z.number().optional(),
});

export const myResponseSchema = z.object({
  data: z.array(itemSchema),
  total: z.number(),
});

// Infer types from schemas
export type MyQuery = z.infer<typeof myQuerySchema>;
export type MyResponse = z.infer<typeof myResponseSchema>;
```

**Benefits:**
- Single source of truth for types and validation
- Runtime type safety with validation
- Automatic TypeScript inference
- Easier to maintain and update
- No type/validation drift

### File Organization

Type definition files should follow this structure (see `src/types/raffle.ts` as reference):

```tsx
import { z } from 'zod';

// ==========================================
// Constants
// ==========================================

export const MY_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

// ==========================================
// Types from Constants
// ==========================================

/**
 * Represents the status of...
 */
export type MyStatus = (typeof MY_STATUS)[keyof typeof MY_STATUS];

// ==========================================
// Schemas
// ==========================================

/**
 * Zod schema for MyStatus
 */
export const myStatusSchema = z.enum([
  MY_STATUS.ACTIVE,
  MY_STATUS.INACTIVE,
]);

/**
 * Schema for the main entity
 */
export const myEntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  status: myStatusSchema,
  createdAt: z.string(),
});

// ==========================================
// Inferred Types
// ==========================================

export type MyEntity = z.infer<typeof myEntitySchema>;

// ==========================================
// Query Schemas
// ==========================================

/**
 * Schema for querying entities
 */
export const myQuerySchema = z.object({
  status: myStatusSchema.optional(),
  limit: z.number().optional(),
});

/**
 * Schema for list response
 */
export const myListResponseSchema = z.object({
  items: z.array(myEntitySchema),
  total: z.number(),
  page: z.number(),
});

// ==========================================
// Query Types
// ==========================================

export type MyQuery = z.infer<typeof myQuerySchema>;
export type MyListResponse = z.infer<typeof myListResponseSchema>;
```

### Reusable Schemas

**Create reusable schema patterns for common structures.** For example, pagination is used across multiple endpoints.

Example of a reusable pagination schema (see `src/types/pagination.ts`):

```tsx
import { z } from 'zod';

/**
 * Schema for pagination metadata
 * Used for paginated API responses
 */
export const paginationMetadataSchema = z.object({
  limit: z.number(),
  page: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

/**
 * Schema for pagination query parameters
 */
export const paginationQuerySchema = z.object({
  limit: z.number().optional(),
  page: z.number().optional(),
});

export type PaginationMetadata = z.infer<typeof paginationMetadataSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
```

**Using reusable schemas with `.extend()`**:

```tsx
import { paginationMetadataSchema, paginationQuerySchema } from './pagination';

// Extend pagination query with additional filters
export const myQuerySchema = paginationQuerySchema.extend({
  status: myStatusSchema.optional(),
  category: z.string().optional(),
});

// Extend pagination metadata with data array
export const myListResponseSchema = paginationMetadataSchema.extend({
  items: z.array(myEntitySchema),
});

export type MyQuery = z.infer<typeof myQuerySchema>;
export type MyListResponse = z.infer<typeof myListResponseSchema>;
```

### Using Schemas in Service Functions

**Always use schemas to validate API responses** in service functions:

```tsx
'use server';

import { myListResponseSchema, type MyListResponse } from '@/types/my-entity';

export async function getMyEntities(
  query?: MyQuery,
): Promise<MyListResponse | { error: string }> {
  try {
    const response = await baseClient.get('/entities', {
      params: buildQueryParams(query),
    });

    // Validate response with schema
    return myListResponseSchema.parse(response.data);
  } catch (error) {
    return { error: 'Failed to fetch entities' };
  }
}
```

### Documentation Requirements

All schemas and types must be documented:

```tsx
/**
 * Schema for creating a raffle
 *
 * Validates all required fields before sending to the API
 */
export const createRaffleSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10),
  price: z.number().positive(),
});

/**
 * Represents a raffle entity
 *
 * Contains all raffle information including metadata,
 * pricing, and participation details
 */
export type Raffle = z.infer<typeof raffleSchema>;
```

### Key Principles

1. **Schema First**: Always define Zod schemas before TypeScript types
2. **Inference**: Use `z.infer<typeof schema>` to get TypeScript types
3. **Validation**: Use schemas to validate API responses and user inputs
4. **Reusability**: Extract common patterns into shared schema utilities
5. **Documentation**: Document all schemas and types with JSDoc comments
6. **Organization**: Follow the structured file organization pattern
7. **Constants**: Use `as const` objects for enums and derive types from them

---

## Error Handling

### Typed Error Response System

All server actions use a typed error handling system for type-safe, predictable error handling.

#### Core Pattern

Every service function returns `ServiceResponse<TData, TErrorCode>`:

```typescript
type ServiceResponse<TData, TErrorCode> =
  | { success: true; data: TData }
  | { success: false; error: TErrorCode };
```

#### Service Implementation

**1. Import error utilities and types:**
```typescript
import { failure, success } from '@/lib/errors';
import { mapAuthError } from '@/lib/errors';
import { AUTH_ERROR_CODES, type AuthErrorCode } from '@/types/errors';
import type { ServiceResponse } from '@/types/service-response';
```

**2. Define response type:**
```typescript
type SignInResponse = ServiceResponse<void, AuthErrorCode>;
```

**3. Return typed responses:**
```typescript
export async function signInUser(input: SignInInput): Promise<SignInResponse> {
  try {
    const response = await baseClient.post('/api/auth/sign-in/email', input);

    if (!response.data.token) {
      return failure(AUTH_ERROR_CODES.INVALID_RESPONSE);
    }

    await setAuthCookies(response.data.token, response.data.user);
    return success(undefined);
  } catch (error) {
    const errorCode = mapAuthError(error);
    return failure(errorCode);
  }
}
```

#### Component Consumption

**1. Create error message mapper:**
```typescript
import { AUTH_ERROR_CODES, type AuthErrorCode } from '@/types/errors';

function getErrorMessage(errorCode: AuthErrorCode): string {
  switch (errorCode) {
    case AUTH_ERROR_CODES.INVALID_CREDENTIALS:
      return 'Invalid email or password.';
    case AUTH_ERROR_CODES.ACCOUNT_LOCKED:
      return 'Your account has been locked.';
    case 'network_error':
      return 'Network error. Please check your connection.';
    case 'timeout_error':
      return 'Request timed out. Please try again.';
    default:
      return 'An unexpected error occurred.';
  }
}
```

**2. Handle response with type narrowing:**
```typescript
const result = await signInUser(data);

if (!result.success) {
  const message = getErrorMessage(result.error);
  setError('root', { message });
  return;
}

// TypeScript knows result.data exists here
router.push('/dashboard');
```

#### Error Code Organization

- **CommonErrorCode**: Network, timeout, server errors (shared across all services)
- **AuthErrorCode**: Authentication-specific errors (sign-in, sign-up, token errors)
- **RaffleErrorCode**: Raffle operation errors (create, fetch, upload)

Error codes follow the naming convention: `<service>:<operation>:<specific>`

Examples:
- `auth:sign-in:invalid-credentials`
- `raffle:create:permission`
- `raffle:upload:too-large`

#### Backend Error Mapping

The `mapAuthError()` and `mapRaffleError()` functions automatically map backend error codes to frontend codes:

```typescript
// Backend returns: { code: 'invalid_credentials' }
// Frontend receives: 'auth:sign-in:invalid-credentials'
```

Fallback handling:
- HTTP 401 → `unauthorized`
- HTTP 403 → `forbidden`
- HTTP 500 → `internal_server_error`
- `ECONNABORTED` → `timeout_error`
- `ERR_NETWORK` → `network_error`
- Unknown → `unknown_error`

#### Client-side Validation

Return error codes early for client-side validation:

```typescript
// File size validation
if (file.size > MAX_SIZE) {
  return failure(RAFFLE_ERROR_CODES.UPLOAD_FILE_TOO_LARGE);
}

// Invalid category
if (!CATEGORY_ID_MAP[input.category]) {
  return failure(RAFFLE_ERROR_CODES.CREATE_INVALID_CATEGORY);
}
```

#### Multiple Operations

For sequential operations, handle each error separately:

```typescript
// Step 1: Create raffle
const createResult = await createRaffle(data);
if (!createResult.success) {
  toast.error(getErrorMessage(createResult.error));
  return;
}

// Step 2: Upload cover (optional)
const uploadResult = await uploadCover(createResult.data.id, file);
if (!uploadResult.success) {
  toast.error(getErrorMessage(uploadResult.error));
  // Raffle created but upload failed - partial success
  router.push('/my-raffles');
  return;
}

toast.success('Raffle created successfully!');
router.push('/my-raffles');
```

#### Key Benefits

1. **Type Safety**: TypeScript enforces handling all error cases
2. **Separation of Concerns**: Error codes in services, messages in components
3. **Exhaustive Checking**: Switch statements must handle all error codes
4. **Backend Integration**: Automatic mapping from backend error codes
5. **Predictable**: Same pattern across all services

---

## Backend Integration

### Understand Before Building

Before implementing any new feature:

1. **Investigate the backend implementation**
   - Understand how the API endpoint works
   - Review the data flow and business logic
   - Check authentication and authorization requirements

2. **Review backend schemas**
   - Ensure frontend types match backend models
   - Validate data structures and field types
   - Maintain sync between frontend and backend types

3. **Consult with backend team** (if applicable)
   - Clarify any uncertainties about API behavior
   - Discuss data validation requirements
   - Coordinate changes that affect both frontend and backend

### Type Safety

Create TypeScript types that mirror backend schemas:

```tsx
// src/types/raffle.ts
export interface Raffle {
  id: string;
  title: string;
  description: string;
  maxParticipants: number;
  currentParticipants: number;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Code Formatting and Standards

### 1. Numeric Literals

**Use underscores (_) as separators for large numbers** to improve readability.

❌ **Avoid:**
```tsx
const MAX_SIZE = 5242880; // 5MB
const TIMEOUT = 30000; // 30 seconds
const PRICE = 1500000; // 1.5 million
```

✅ **Prefer:**
```tsx
const MAX_SIZE = 5_242_880; // 5MB
const TIMEOUT = 30_000; // 30 seconds
const PRICE = 1_500_000; // 1.5 million
```

**Benefits:**
- Easier to read large numbers at a glance
- Reduces errors when working with large values
- Standard practice in modern TypeScript/JavaScript

### 2. Package Manager

**Always use Bun for package management and script execution** instead of npm, yarn, or pnpm.

❌ **Avoid:**
```bash
npm install
npm run dev
npm test
```

✅ **Prefer:**
```bash
bun install
bun run dev
bun test
```

**Common Bun commands:**
- `bun add <package>` - Install package
- `bun remove <package>` - Remove package
- `bun install` - Install all dependencies
- `bun run <script>` - Run package.json script
- `bun test` - Run tests

### 3. Language and Localization

**All code, comments, documentation, and user-facing text must be written in English.**

This includes:
- Variable and function names
- Comments and JSDoc documentation
- Error messages
- User interface text
- Console logs
- Git commit messages

❌ **Avoid (non-English example):**
```tsx
// Comment in another language
function functionNameInAnotherLanguage() {
  return { error: 'Error message in another language' };
}
```

✅ **Prefer (English):**
```tsx
// Validates if the user is authenticated
function validateUser() {
  return { error: 'You must be signed in' };
}
```

**Rationale:**
- Maintains consistency across the codebase
- Enables international collaboration
- Standard practice in professional development
- Easier code review and maintenance

---

## Post-Implementation Verification

**CRITICAL: After every feature implementation or modification, you MUST perform the following verification steps before considering the task complete.**

### 1. Lint Verification (Required)

Always run the lint command to catch errors, unused variables, and code quality issues:

```bash
bun run lint
```

**What to check:**
- ✅ No ESLint errors or warnings
- ✅ No unused variables, imports, or props
- ✅ No React Hooks violations
- ✅ All imports resolve correctly

**If lint fails:**
- Review the error messages carefully
- Fix all errors before proceeding
- Run lint again to confirm fixes

### 2. Build Verification (Optional/Manual)

The build can be run manually when needed or before deployment:

```bash
bun run build
```

**When to run build:**
- Before creating a pull request
- Before deploying to production
- When making significant changes to types or configurations
- If you want to verify the production build

**What to check:**
- ✅ Build completes successfully without errors
- ✅ No TypeScript type errors
- ✅ No missing dependencies

### 3. ESLint and React Hooks Validation

Common errors to watch for and fix:

#### A. React Hooks Errors

**Error: `setState` in `useEffect`**
```typescript
// ❌ BAD - Causes cascading renders
useEffect(() => {
  updateState(); // Calls setState synchronously
  const interval = setInterval(updateState, 1000);
  return () => clearInterval(interval);
}, [updateState]);

// ✅ GOOD - Only set up subscription
useEffect(() => {
  const interval = setInterval(updateState, 1000);
  return () => clearInterval(interval);
}, [updateState]);
```

**Error: Variable accessed before declaration**
```typescript
// ❌ BAD - Function used before declaration in useState
const [state, setState] = useState(() => calculateValue());

function calculateValue() {
  return someValue;
}

// ✅ GOOD - Move function before useState
function calculateValue() {
  return someValue;
}

const [state, setState] = useState(() => calculateValue());
```

#### B. Unused Variables and Imports

**Always remove:**
- Unused imports
- Unused function parameters
- Unused variables
- Unused props in interfaces

**Example cleanup:**
```typescript
// ❌ BAD - Unused imports and props
import { useState, useEffect, useMemo } from 'react'; // useMemo not used

interface Props {
  name: string;
  age: number;    // age not used
  email: string;
}

function Component({ name, age, email }: Props) {
  return <div>{name}</div>; // Only name is used
}

// ✅ GOOD - Only what's needed
import { useState } from 'react';

interface Props {
  name: string;
}

function Component({ name }: Props) {
  return <div>{name}</div>;
}
```

### 4. Verification Checklist

Before marking a task as complete, verify:

**Code Quality (Required):**
- [ ] `bun run lint` passes without errors or warnings
- [ ] No unused variables, imports, or props
- [ ] No TypeScript `any` types (unless absolutely necessary)
- [ ] All functions have JSDoc documentation
- [ ] Logic extracted from JSX into helper functions

**React Best Practices:**
- [ ] No `setState` called directly in `useEffect` body
- [ ] All hooks follow Rules of Hooks
- [ ] Dependencies arrays are correct and complete
- [ ] No infinite render loops

**Runtime:**
- [ ] No console errors when running `bun run dev`
- [ ] All imports resolve correctly
- [ ] Feature works as expected manually

**Performance:**
- [ ] Expensive calculations wrapped in `useMemo`
- [ ] Callbacks wrapped in `useCallback` when needed
- [ ] Components don't re-render unnecessarily

### 5. Quick Verification Commands

```bash
# Run linter (REQUIRED after every change)
bun run lint

# Run development server to check for runtime errors
bun run dev

# Build the project (optional - use when needed)
bun run build

# Run type checking (optional)
bun run type-check  # or: tsc --noEmit
```

### 6. Common Fixes

**Fix unused props:**
```typescript
// Before
interface Props {
  id: string;
  name: string;
  age: number;  // Not used
}

// After
interface Props {
  id: string;
  name: string;
}
```

**Fix unused imports:**
```typescript
// Before
import { useState, useEffect, useMemo } from 'react';

// After (if only useState is used)
import { useState } from 'react';
```

**Fix function declaration order:**
```typescript
// Before - Error: cannot access before declaration
export function Component() {
  const value = calculateValue(); // Used here
  // ...
}

function calculateValue() {  // Declared after use
  return 10;
}

// After - Move helper function outside or before use
function calculateValue() {
  return 10;
}

export function Component() {
  const value = calculateValue();
  // ...
}
```

### 7. Integration with Development Workflow

**After implementing a feature:**
1. Write the code following all guidelines
2. Run `bun run lint` to verify code quality
3. Review ESLint errors/warnings
4. Remove all unused code
5. Fix all React Hooks violations
6. Run lint again to confirm all issues resolved
7. Test the feature manually with `bun run dev`
8. (Optional) Run `bun run build` if preparing for PR or deployment
9. Only then consider the task complete

**Never skip lint verification.** Catching errors early prevents:
- Runtime errors
- Code review delays
- Technical debt accumulation
- Unused code cluttering the codebase

---

## Summary

Following these guidelines ensures:
- Secure and performant applications
- Maintainable and readable code
- Consistent patterns across the codebase
- Better collaboration between team members
- Easier onboarding for new developers

This document will be updated as new patterns and best practices emerge.
