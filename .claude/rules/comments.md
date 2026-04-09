---
paths:
  - 'src/**/*.ts'
  - 'src/**/*.tsx'
---

# Step Narration

- Number steps in multi-phase functions: `// Step 1: Validate form input against shared Zod schema.`

# Component Boundaries

- `'use client'` / `'use server'` — inline comment when boundary choice is non-obvious
- Server Components: comment data-fetching strategy and caching intent
- Server Actions: comment mutation side-effects, revalidation targets, redirect behavior

# Hooks and Memoization

- `useMemo`/`useCallback` — comment what re-render/computation is avoided and why
- `useEffect` — comment sync target, why deps chosen, cleanup rationale
- Custom hooks: JSDoc with purpose, return shape, when to use vs not
- Refs: comment why ref instead of state

# Context Providers

- Comment scope boundaries and why this tree level was chosen

# Route Segments

- `layout.tsx`/`page.tsx`: comment non-obvious data flow between segments
- Suspense/`loading.tsx`/`error.tsx`: comment coverage and fallback UX
- `next/dynamic`: comment why lazy-loaded

# Safety Valves

- `dangerouslySetInnerHTML`/`suppressHydrationWarning`: comment why safe, what sanitizes
- Type assertions (`as`, `!`): comment why the cast is sound

# Conditional Rendering and Keys

- Comment business rules driving visibility, not the JSX mechanic
- Comment non-index key choice when key source is non-obvious

# Zod Schemas

- Shared client/server schemas: comment validation boundary and which side enforces what
