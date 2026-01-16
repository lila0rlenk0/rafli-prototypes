# Raffly

Next.js 16 raffle platform with Clean Architecture.

## Commands

- `bun run dev` - dev server
- `bun run lint` - lint (REQUIRED after changes)
- `bun run build` - production build

## Structure

- src/app/ - Next.js App Router
- src/components/ - UI components
- src/services/ - server actions
- src/types/ - Zod schemas & types
- src/lib/ - utilities, error handling

## Critical Rules

ALWAYS: Write code and comments in English
ALWAYS: Use Bun, never npm/yarn/pnpm
ALWAYS: Use underscores in large numbers (1_000_000)
ALWAYS: Run `bun run lint` before completing tasks
NEVER: Skip lint verification
NEVER: Use `any` types without justification

## Layer Guidelines

@src/services/CLAUDE.md
@src/components/CLAUDE.md
@src/types/CLAUDE.md
@src/lib/CLAUDE.md

## Reference

@docs/verification.md
