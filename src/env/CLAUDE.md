# Environment Variables Layer

Parsed environment variables using `@t3-oss/env-nextjs` with Zod validation.

## Golden Rules

CRITICAL: Never use `process.env` directly in application code
ALWAYS: Import from `@/env/server` for server-side variables
ALWAYS: Import from `@/env/client` for client-side variables
ALWAYS: Add new env vars to the appropriate file with Zod validation

## Files

- `server.ts` - Server-only variables (secrets, backend URLs)
- `client.ts` - Client-side variables (must use `NEXT_PUBLIC_` prefix)

## Usage

```typescript
// Server code (server actions, API routes)
import { env } from '@/env/server';

const backendUrl = env.BACKEND_URL;
const secret = env.S2S_SECRET;

// Client code (components, hooks)
import { clientEnv } from '@/env/client';

const publicUrl = clientEnv.NEXT_PUBLIC_BACKEND_URL;
```

## Adding New Variables

1. Add Zod schema to appropriate file (`server.ts` or `client.ts`)
2. Add to `runtimeEnv` mapping
3. Add to `.env.example` if applicable
4. Update `.env.local` with actual value

```typescript
// Example: Adding a new server variable
export const env = createEnv({
	server: {
		// ... existing
		NEW_API_KEY: z.string().min(1),
	},
	runtimeEnv: {
		// ... existing
		NEW_API_KEY: process.env.NEW_API_KEY,
	},
});
```

## Security

- Server variables are never exposed to browser
- Client variables are bundled into JS - never put secrets here
- S2S_SECRET is used for server-to-server authentication
