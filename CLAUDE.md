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

## Philosophy

In all interactions, be extremely concise and sacrifice grammar for the sake of concision.
Deliver the simplest excellent viable solution that meets the requirements, deferring edge cases and enhancements until real evidence demands them.
Excellence at minimum viable complexity.

The codebase will outlive you. Every shortcut becomes someone else's burden. Every hack compounds into technical debt that slows the whole team down.
You are not just writing code. You are shaping the future of this project. The patterns you establish will be copied. The corners you cut will be cut again.
Fight entropy. Leave the codebase better than you found it.

# Development Approach

- Map full solution architecture, internalize todo's tasks, then build
- Never keep deprecated/legacy code when implementing
- Always remove dead code. Keep implementation clean.

# Communication Style

- Extreme concision over grammar in all responses and commits
- End plans with unresolved questions (if any):
  - Only blockers - things preventing implementation
  - Only binary choices - pick A or B
  - No speculative "what if" scenarios
  - No architecture philosophy debates
  - Max 3 questions - if more, you're overthinking

# Planning Philosophy

- Default to simplest solution that works excellent
- No speculative features or "nice-to-haves"
- No premature optimization or abstraction
- Build for current requirements only - iterate later if needed
- If plan exceeds 5 steps, challenge each one's necessity
- Avoid over-engineering

# Markdown Reports

- Never create summary/report markdown files unless explicitly requested
- If requested:
  - Ask where to place it first
  - Max 50 lines total
  - Minimal markdown syntax - readable in VSCode plain view
  - Headers: `#`, `##`, `###`
  - Lists: `-` only
  - Code blocks: ` ``` ` with language
  - Inline code: `` ` `` for variables, functions, paths
  - Plain text otherwise
  - No: tables, nested lists, excessive formatting, badges, horizontal rules
  - Format for IDE reading, not GitHub rendering
