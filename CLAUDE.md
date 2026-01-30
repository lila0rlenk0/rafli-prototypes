# Raffly

Next.js raffle platform with Clean Architecture.

## Commands

```bash
bun run dev      # development server
bun run lint     # lint (REQUIRED after changes)
bun run build    # production build
```

## Architecture

```
src/
├── app/         # Next.js App Router (pages, layouts, routes)
├── components/  # UI layer (Server + Client components)
├── services/    # Data layer (server actions, API calls)
├── types/       # Domain layer (Zod schemas, type definitions)
├── lib/         # Infrastructure (utilities, clients, errors)
├── providers/   # React context providers
├── store/       # Zustand client state
└── env/         # Environment configuration
```

## Golden Rules

CRITICAL: Server Components by default
CRITICAL: All API calls via server actions (`'use server'`)
CRITICAL: Zod schema-first type definitions
ALWAYS: `ServiceResponse<T, E>` for all service returns
ALWAYS: Run `bun run lint` before completing tasks
ALWAYS: Write code and comments in English
ALWAYS: Use Bun, never npm/yarn/pnpm
ALWAYS: Use underscores in large numbers (1_000_000)
ALWAYS: Run `bun run lint` before completing tasks
ALWAYS: Use `@/env/server` or `@/env/client` for environment variables
NEVER: Skip lint verification
NEVER: Use `any` types without justification
NEVER: Use `process.env` directly (use parsed env from `@/env/`)
NEVER: Expose secrets to client


## Conventions

- **Imports**: Direct paths, no barrel exports (`@/components/ui/button`)
- **Functions**: Use `function` declarations, not arrow functions
- **Documentation**: JSDoc on all exports
- **Errors**: Typed error codes via `ServiceResponse`, never throw raw

## Layer Guidelines

@src/components/CLAUDE.md
@src/services/CLAUDE.md
@src/types/CLAUDE.md
@src/lib/CLAUDE.md
@src/env/CLAUDE.md

## Reference

@docs/verification.md
