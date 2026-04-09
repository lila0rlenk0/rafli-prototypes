---
paths:
  - 'src/env/**'
---

# Environment Variables

Parsed with `@t3-oss/env-nextjs` + Zod.

- `server.ts` — server-only (secrets, backend URLs). `import { env } from '@/env/server'`
- `client.ts` — client-side (`NEXT_PUBLIC_` prefix). `import { clientEnv } from '@/env/client'`

## Adding Variables

1. add Zod schema to `server.ts` or `client.ts`
2. add to `runtimeEnv` mapping
3. add to `.env.example` and `.env.local`

## Security

- server vars never exposed to browser
- client vars bundled into JS — no secrets
- `S2S_SECRET` for server-to-server auth
