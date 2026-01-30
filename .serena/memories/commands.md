# Commands

## Development

```bash
bun run dev      # Start dev server
bun run build    # Production build
bun run lint     # Lint (REQUIRED after changes)
```

## Package Management

```bash
bun install          # Install deps
bun add <pkg>        # Add dependency
bun add -d <pkg>     # Add dev dependency
```

## Git

```bash
gh pr create         # Create PR
gh pr view           # View PR
```

## Important

- ALWAYS use `bun`, never npm/yarn/pnpm
- ALWAYS run `bun run lint` before finishing
- Path alias: `@/*` → `./src/*`
