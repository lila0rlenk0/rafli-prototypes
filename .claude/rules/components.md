---
paths:
  - 'src/components/**'
  - 'src/app/**/*.tsx'
---

# Components

Server Components first architecture. UI organized by domain.

## Directory

- `ui/` — base primitives (Button, Input, Card), some generated via shadcn
- `auth/`, `raffle/`, `host/`, `payment/`, `filters/`, `promo-code/`, `mode/`, `order/`, `fulfillment/`, `notifications/`, `report/`, `verification/` — domain components

## Server vs Client

- Server Components — static content, data fetching, SEO-critical, no browser APIs
- Client Components — interactive UI, React hooks, browser APIs. Mark with `'use client'`

## Runtime Data in Layouts

Runtime data (`cookies()`, `headers()`, `searchParams`, `getSession()`) blocks streaming. Extract and wrap in Suspense.

```tsx
// bad — blocks entire route tree
export default async function Layout({ children }) {
	const session = await getSession();
	return <Nav user={session.user}>{children}</Nav>;
}

// good — enables streaming
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

## Loading States

- Page-level — create `loading.tsx` sibling to `page.tsx`
- Component-level — wrap async children in `<Suspense fallback={<Skeleton />}>`

## Data Fetching in Server Components

Parallelize independent fetches — never await sequentially when data is independent. Start promises early, await late — only block on data when you actually need it.

```tsx
// bad — getRaffle waits for getSession to finish
const session = await getSession();
const raffleResult = await getRaffle(slug);

// good — both start immediately
const [session, raffleResult] = await Promise.all([
	getSession(),
	getRaffle(slug),
]);

// best — start all, await guard first, then await rest
const sessionPromise = getSession();
const dataPromise = Promise.all([getRaffle(slug), getCategories()]);
const session = await sessionPromise;
if (!hasPermission(session)) redirect('/');
const [raffleResult, categoriesResult] = await dataPromise;
```

## Per-Request Deduplication

Prefer `getCurrentUser` (wrapped in `React.cache()`) over raw `getSession()` in server components — avoids redundant JWT decoding when layouts and pages both need the user.

## RSC Serialization

Only pass fields the client component actually uses — everything crossing the Server/Client boundary is serialized into HTML.

```tsx
// bad — serializes all 50 user fields
<Profile user={user} />

// good — serializes only what's needed
<Profile name={user.name} avatarUrl={user.avatarUrl} />
```

## Client Component Threshold

`'use client'` required when: React hooks, event handlers (`onClick`, `onChange`), browser APIs (`window`, `document`), or state management. Form submissions via server actions alone do not require it — use `action` prop.

## Performance

- `useMemo` when computation iterates arrays, parses dates, or takes >1ms — skip for primitive math or string concat
- `useCallback` when passing callbacks to memoized children or as effect dependencies — skip for inline JSX handlers
- Functional `setState` (`setCount(c => c + 1)`) when new state depends on previous — also removes `currentState` from `useCallback` deps
- `useTransition` / `startTransition` for non-urgent server action calls, navigation, and frequent DOM events (scroll, resize)
- Debounce scroll/resize (100ms), input search (300ms)
- `next/image` for all images, `next/dynamic` with `ssr: false` for heavy client components (editors, charts, web3)
- Never define components inside other components — causes remount on every render
- Prefer composition over prop drilling
- Hoist default non-primitive props (objects, arrays) to module scope — inline `{}` or `[]` defaults break `React.memo`
