---
paths:
  - 'src/components/**'
  - 'src/app/**/*.tsx'
---

# Components

Server Components first. UI organized by domain.

## Directory

`ui/` — shadcn primitives. Domain: `auth/`, `raffle/`, `host/`, `payment/`, `filters/`, `promo-code/`, `mode/`, `order/`, `fulfillment/`, `notifications/`, `report/`, `verification/`.

## Server vs Client

- Server — static content, data fetching, SEO, no browser APIs
- Client — hooks, event handlers, browser APIs. Mark `'use client'`
- `'use client'` required for: hooks, `onClick`/`onChange`, `window`/`document`, state. Form `action` prop alone does not require it

## Runtime Data in Layouts

`cookies()`, `headers()`, `searchParams`, `getSession()` block streaming. Extract to async child, wrap in Suspense.

## Loading States

- page-level: `loading.tsx` sibling to `page.tsx`
- component-level: `<Suspense fallback={<Skeleton />}>`

## Per-Request Deduplication

`getCurrentUser` (React.cache-wrapped) over raw `getSession()` — avoids redundant JWT decoding across layouts and pages.

## Performance

See `vercel-react-best-practices` skill for: parallel fetching, RSC serialization, `useMemo`/`useCallback`, `useTransition`, `next/dynamic`, bundle optimization. See `vercel-composition-patterns` for compound components and composition over boolean props.
