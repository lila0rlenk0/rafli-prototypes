# Conventions

## Code Style

- `function` declarations, not arrow functions (except in hooks)
- JSDoc on all exports
- No `any` without justification
- Underscores in large numbers: `1_000_000`
- English for code and comments

## Imports

- Direct paths: `@/components/ui/button`
- No barrel exports (index.ts)

## Naming

- Files: kebab-case (`get-raffle.ts`)
- Components: PascalCase (`UserCard`)
- Functions: camelCase (`getUserData`)
- Constants: SCREAMING_SNAKE_CASE (`MAX_SIZE`)
- Error codes: `domain:operation` (`auth:invalid-credentials`)

## Types

- Zod schema first, then infer type
- Never manual interfaces without schema
- `as const` for constant objects

## React

- Server Components by default
- `'use client'` only for interactivity
- Runtime data in Suspense
- Extract logic from JSX into functions
