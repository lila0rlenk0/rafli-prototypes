# Rafli

Raffle platform built with Next.js App Router and Clean Architecture.

## Stack

- Runtime: Bun
- Framework: Next.js (App Router)
- Language: TypeScript (strict)
- Styling: Tailwind CSS
- UI: Radix primitives
- Forms: react-hook-form + Zod
- State: Zustand (client), Server Actions (server)
- HTTP: Axios

## Architecture

```
src/
├── app/         # Pages, layouts, routes
├── components/  # UI (Server + Client)
├── services/    # Server actions (API calls)
├── types/       # Zod schemas, types
├── lib/         # Utilities, clients, errors
├── providers/   # Context providers
├── store/       # Client state
└── env/         # Environment config
```

## Key Patterns

- Server Components first
- Zod schema-first types
- ServiceResponse<T, E> for all service returns
- Server actions for all external API calls
