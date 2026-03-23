---
paths:
  - 'src/types/**'
---

# Types

Zod schema-first type definitions. Single source of truth for data contracts.

## Directory

- `errors/` — error code definitions by domain
- `service-response.ts` — generic `ServiceResponse<T, E>` wrapper
- `pagination.ts` — reusable pagination schema
- `[domain].ts` — entity schemas (raffle.ts, user.ts, etc.)

## File Structure

Follow this order in every type file:

```tsx
import { z } from 'zod';

// Constants
export const MY_STATUS = {
	ACTIVE: 'active',
	INACTIVE: 'inactive',
} as const;

// Types from Constants
export type MyStatus = (typeof MY_STATUS)[keyof typeof MY_STATUS];

// Schemas
export const myStatusSchema = z.enum([MY_STATUS.ACTIVE, MY_STATUS.INACTIVE]);

/** Schema for main entity */
export const myEntitySchema = z.object({
	id: z.string(),
	name: z.string(),
	status: myStatusSchema,
	createdAt: z.string(),
});

// Inferred Types
export type MyEntity = z.infer<typeof myEntitySchema>;

// Query Schemas
export const myQuerySchema = z.object({
	status: myStatusSchema.optional(),
	limit: z.number().optional(),
});
export type MyQuery = z.infer<typeof myQuerySchema>;
```

## Rules

- Define Zod schemas first, then infer types with `z.infer<>`
- Never define interfaces manually without a backing schema
- Use `as const` for constant objects
- Use `.extend()` for schema composition
- Error code format: `<domain>:<scope>:<specific>` (matches backend RFC 7807)
