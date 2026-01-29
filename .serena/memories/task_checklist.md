# Task Checklist

## Required

1. `bun run lint` passes
2. No unused imports/variables
3. No `any` types
4. JSDoc on exports
5. Logic extracted from JSX

## React

- No setState in useEffect body
- Correct dependency arrays
- Runtime data wrapped in Suspense

## Before PR

```bash
bun run build
```

## Cleanup

```bash
rm -rf .playwright-mcp  # After visual debugging
```
