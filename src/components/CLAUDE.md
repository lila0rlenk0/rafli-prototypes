# Components Layer

UI components following Server Components First architecture.

## Golden Rules

CRITICAL: Server Components by default
CRITICAL: Wrap runtime data access in Suspense
ALWAYS: Extract logic from JSX into functions
ALWAYS: Use `function` declarations, not arrow functions
ALWAYS: JSDoc on all functions and components
ALWAYS: Import directly from component files (e.g., `@/components/host/host-profile-card`)
NEVER: 'use client' without interactivity requirement
NEVER: Create barrel exports (index.ts) in component folders

## Server vs Client

**Server Components:**
- Static content, data fetching, SEO-critical
- No browser APIs, no event handlers

**Client Components:**
- Interactive UI (clicks, forms, state)
- Browser APIs (localStorage, geolocation)
- Mark with `'use client'` at top

## Runtime Data + Suspense (CRITICAL)

Runtime data (`cookies()`, `headers()`, `searchParams`, `getSession()`) MUST be in Suspense.

```tsx
// BAD - blocks entire page
export default async function Layout({ children }) {
  const session = await getSession(); // cookies() inside
  return <Nav user={session.user}>{children}</Nav>;
}

// GOOD - extract and wrap
async function LayoutContent({ children }) {
  const session = await getSession();
  return <Nav user={session.user}>{children}</Nav>;
}

export default function Layout({ children }) {
  return (
    <Suspense fallback={<Spinner />}>
      <LayoutContent>{children}</LayoutContent>
    </Suspense>
  );
}
```

## Logic Extraction

```tsx
// BAD
<div>{user.name || user.email}</div>
<div>{count.toLocaleString()}</div>

// GOOD
export function UserCard({ user, count }: Props) {
  /**
   * Gets display name for user
   * @param user - User object
   * @returns Display name string
   */
  function getDisplayName(user: User): string {
    return user.name || user.email;
  }

  function formatCount(count: number): string {
    return count.toLocaleString();
  }

  return (
    <div>{getDisplayName(user)}</div>
    <div>{formatCount(count)}</div>
  );
}
```

## Function Style

```tsx
// BAD
const handleClick = () => { ... };
const formatValue = (v: number) => v.toLocaleString();

// GOOD
function handleClick() { ... }
function formatValue(v: number) { return v.toLocaleString(); }

// Arrow functions ONLY in hooks:
const memoizedFn = useCallback(() => { ... }, []);
const computed = useMemo(() => expensive(data), [data]);
```

## Loading States

**Suspense (granular):**
```tsx
<Suspense fallback={<Skeleton />}>
  <AsyncComponent />
</Suspense>
```

**loading.tsx (page-level):**
```tsx
// app/raffles/loading.tsx
export default function Loading() {
  return <PageSkeleton />;
}
```

## Performance

- `useMemo` for expensive calculations
- `useCallback` for callback stability
- Debounce frequent events (scroll, input)
- Use Next.js `Image` component
- Code split heavy components with `dynamic()`
