# Types Layer

Zod schema-first type definitions. Reference: `raffle.ts`, `pagination.ts`.

## Golden Rules

CRITICAL: Define Zod schemas FIRST, then infer types
NEVER: Define interfaces manually without schema
ALWAYS: Validate API responses with schemas
ALWAYS: Document schemas with JSDoc

## File Organization

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

export type MyStatus = (typeof MY_STATUS)[keyof typeof MY_STATUS];

// ==========================================
// Schemas
// ==========================================

export const myStatusSchema = z.enum([
  MY_STATUS.ACTIVE,
  MY_STATUS.INACTIVE,
]);

/**
 * Schema for main entity
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

export const myQuerySchema = z.object({
  status: myStatusSchema.optional(),
  limit: z.number().optional(),
});

export type MyQuery = z.infer<typeof myQuerySchema>;
```

## Reusable Schemas

Use `.extend()` for composition:

```tsx
import { paginationMetadataSchema } from './pagination';

export const myListResponseSchema = paginationMetadataSchema.extend({
  items: z.array(myEntitySchema),
});

export type MyListResponse = z.infer<typeof myListResponseSchema>;
```

## Anti-Patterns

```tsx
// BAD - manual interface
export interface MyQuery {
  status?: string;
  limit?: number;
}

// GOOD - schema first
export const myQuerySchema = z.object({
  status: z.string().optional(),
  limit: z.number().optional(),
});
export type MyQuery = z.infer<typeof myQuerySchema>;
```

## Key Files

- `raffle.ts` - raffle entity schemas
- `pagination.ts` - reusable pagination
- `errors.ts` - error code types
- `service-response.ts` - ServiceResponse type
