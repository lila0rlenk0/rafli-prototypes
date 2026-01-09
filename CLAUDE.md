# Project Development Guidelines

This document contains important guidelines and best practices for developing features in this project. Please follow these guidelines to maintain code quality, security, and consistency.

## API Requests and Server Actions

### Service Layer Architecture
- **All API requests must be implemented as server actions** located in `@src/services/`
- The services folder is organized by different service domains (e.g., `auth`, `raffle`)
- Each service should contain related request functions grouped together

### Why Server Actions?
Server actions provide several critical benefits:
1. **Security**: Prevents exposure of API keys, authentication tokens, and API routes to the client
2. **Server-side features**: Enables use of server-only features like cookies and secure environment variables
3. **Performance**: Reduces client bundle size and improves initial page load
4. **Type safety**: Better integration with TypeScript and server-side validation

### Client-side Requests (Edge Cases Only)
- Client-side request functions should only be created in exceptional edge cases
- If you need to create a client-side function, document the reasoning clearly
- Always consider security implications before exposing any client-side request logic

### Caching with Next.js 16 'use cache'

#### The Limitation
Next.js 16's `'use cache'` directive **cannot access dynamic data sources** like `cookies()`, `headers()`, or `searchParams`. Since our authentication uses cookies to store the Bearer token, we cannot use caching for authenticated endpoints.

#### Simplified Cache Strategy

To keep the architecture simple and maintainable:

**✅ Use cache for:**
- Public GET endpoints (no authentication required)
- Static or semi-static data that doesn't require user context
- Examples: public raffle listings, categories, public profiles

**❌ Don't use cache for:**
- Any authenticated endpoints (requires cookies for token)
- Mutations (POST, PUT, PATCH, DELETE)
- User-specific data
- Real-time or frequently changing data

#### Pattern for Public Cached Endpoints

```tsx
'use server';

/**
 * Fetches public raffles with caching
 */
export async function getPublicRaffles(params?: QueryParams) {
  'use cache';

  try {
    // Use baseClient (no authentication)
    const response = await baseClient.get('/public/raffles', {
      params,
      next: {
        tags: ['public-raffles'],
        revalidate: 60, // Cache for 60 seconds
      },
    });

    return response.data;
  } catch (error) {
    return { error: 'Failed to fetch raffles' };
  }
}
```

#### Pattern for Authenticated Endpoints (No Cache)

```tsx
'use server';

/**
 * Fetches user's raffles
 * No caching because it requires authentication (cookies)
 */
export async function getMyRaffles(query?: QueryParams) {
  try {
    // authenticatedClient handles token injection via interceptor
    const response = await authenticatedClient.get('/me/raffles', {
      params: query,
    });

    return response.data;
  } catch (error) {
    return { error: 'Failed to fetch raffles' };
  }
}
```

#### Quick Reference

| Endpoint Type | Authentication | Use Cache? | Client Type |
|---------------|----------------|------------|-------------|
| GET (public) | None | ✅ Yes | `baseClient` |
| GET (authenticated) | Required | ❌ No | `authenticatedClient` |
| POST/PUT/DELETE | Any | ❌ No | `baseClient` or `authenticatedClient` |

**Rationale:**
- Keeps architecture simple and predictable
- Avoids complex wrapper patterns
- Clear separation: public data can be cached, authenticated data cannot
- No risk of cache-related authentication bugs

## Component Development

### 1. Logic Extraction from JSX

**Avoid inline logic in JSX.** Extract calculations, transformations, and data formatting into dedicated functions **defined inside the component**.

❌ **Bad Practice:**
```tsx
export function RaffleCard({ raffle, user }: Props) {
  return (
    <div>{user.name}</div>
    <div>{raffle.maxParticipants.toLocaleString()}</div>
  );
}
```

✅ **Good Practice:**
```tsx
export function RaffleCard({ raffle, user }: Props) {
  /**
   * Gets the display name for the user
   * @param user - The user object
   * @returns The formatted user name
   */
  function getUserDisplayName(user: User): string {
    return user.name || user.email;
  }

  /**
   * Formats a participant count with proper locale string formatting
   * @param count - The number of participants
   * @returns Formatted string with locale-appropriate number formatting
   */
  function formatParticipantCount(count: number): string {
    return count.toLocaleString();
  }

  const userName = getUserDisplayName(user);
  const formattedMaxParticipants = formatParticipantCount(raffle.maxParticipants);

  return (
    <div>{userName}</div>
    <div>{formattedMaxParticipants}</div>
  );
}
```

**Important:** Functions should be defined **inside the component** to:
- Keep related logic close to where it's used
- Access component props and state directly without passing many parameters
- Maintain component encapsulation
- Make the component self-contained and easier to understand

**Benefits:**
- Easier maintenance and debugging
- Simpler testing of logic in isolation
- Better readability and code reusability
- Facilitates future modifications
- Clear separation between logic and presentation

### 2. Documentation Requirements

#### Function Documentation
All functions must include JSDoc comments with:
- Description of what the function does
- Parameter descriptions with types
- Return value description
- Example usage (when helpful)

Example:
```tsx
/**
 * Formats a participant count with proper locale string formatting
 * @param count - The number of participants
 * @returns Formatted string with locale-appropriate number formatting
 */
function formatParticipantCount(count: number): string {
  return count.toLocaleString();
}
```

#### Component Documentation
Every component must have a description at the top explaining its functionality:

```tsx
/**
 * RaffleCard Component
 *
 * Displays a raffle item with its details including title, description,
 * participant count, and action buttons. Handles both active and completed
 * raffle states with different visual treatments.
 */
export function RaffleCard({ raffle }: RaffleCardProps) {
  // component implementation
}
```

### 3. Server Components First

**Always prefer Server Components over Client Components** unless client-side interactivity is required.

When to use Server Components:
- Static content rendering
- Data fetching from databases or APIs
- Content that doesn't need client-side state
- SEO-critical content

When to use Client Components:
- Interactive UI elements (click handlers, form inputs)
- Browser APIs (localStorage, geolocation, etc.)
- Client-side state management
- Real-time features requiring event listeners

Mark client components explicitly:
```tsx
'use client';

export function InteractiveButton() {
  // client component implementation
}
```

#### Loading States for Async Server Components

**When creating async Server Components, always consider the loading state.** Next.js provides two main approaches:

**Option 1: Using Suspense (Recommended for granular loading)**
```tsx
// app/raffles/page.tsx
import { Suspense } from 'react';
import { RaffleList } from '@/components/raffle-list';
import { RaffleListSkeleton } from '@/components/raffle-list-skeleton';

export default function RafflesPage() {
  return (
    <div>
      <h1>Raffles</h1>
      <Suspense fallback={<RaffleListSkeleton />}>
        <RaffleList />
      </Suspense>
    </div>
  );
}

// components/raffle-list.tsx
export async function RaffleList() {
  const raffles = await getRaffles();

  return (
    <div>
      {raffles.map(raffle => (
        <RaffleCard key={raffle.id} raffle={raffle} />
      ))}
    </div>
  );
}
```

**Option 2: Using loading.tsx (Page-level loading)**
```tsx
// app/raffles/loading.tsx
import { RaffleListSkeleton } from '@/components/raffle-list-skeleton';

export default function Loading() {
  return (
    <div>
      <h1>Raffles</h1>
      <RaffleListSkeleton />
    </div>
  );
}

// app/raffles/page.tsx
export default async function RafflesPage() {
  const raffles = await getRaffles();

  return (
    <div>
      <h1>Raffles</h1>
      <div>
        {raffles.map(raffle => (
          <RaffleCard key={raffle.id} raffle={raffle} />
        ))}
      </div>
    </div>
  );
}
```

**When to use each approach:**

Use **Suspense** when:
- You need granular loading states for specific components
- Multiple independent data sources load at different times
- You want to show partial content while other parts load
- You need nested loading boundaries

Use **loading.tsx** when:
- The entire page should show a loading state
- All data loads together
- You want a simpler, more straightforward loading pattern
- The page is a single cohesive unit

**Best Practices:**
- Always provide a meaningful loading skeleton that matches the content structure
- Never let async components render without a loading boundary
- Keep skeleton components visually similar to the actual content
- Consider using the Skeleton component from your UI library for consistency

### 4. Performance Optimization

When creating client-side interactions, always prioritize performance:

- **Memoization**: Use `useMemo` and `useCallback` for expensive calculations and callback stability
- **Lazy loading**: Implement code splitting for heavy components
- **Debouncing/Throttling**: Apply to frequent events (scroll, resize, input)
- **Virtual scrolling**: Use for long lists
- **Image optimization**: Always use Next.js `Image` component
- **Bundle size**: Monitor and minimize client-side JavaScript

Example:
```tsx
'use client';

import { useMemo, useCallback } from 'react';

export function OptimizedComponent({ data }) {
  // Memoize expensive calculations
  const processedData = useMemo(() => {
    return heavyDataProcessing(data);
  }, [data]);

  // Memoize callbacks to prevent unnecessary re-renders
  const handleClick = useCallback(() => {
    // handle click logic
  }, []);

  return <div onClick={handleClick}>{processedData}</div>;
}
```

### 5. Function Declaration Style

**Prefer `function` declarations over arrow functions** for regular functions, unless there's a specific need for arrow functions.

Use `function` declarations for:
- Regular utility functions
- Helper functions
- Component functions
- Service functions
- Any standalone function

❌ **Avoid:**
```tsx
const formatParticipantCount = (count: number): string => {
  return count.toLocaleString();
};

const getUserDisplayName = (user: User) => {
  return user.name || user.email;
};
```

✅ **Prefer:**
```tsx
function formatParticipantCount(count: number): string {
  return count.toLocaleString();
}

function getUserDisplayName(user: User) {
  return user.name || user.email;
}
```

**When to use arrow functions:**
- Inside `useCallback` hooks (required for proper memoization)
- Inside `useMemo` hooks
- Other React hooks that require function references
- Edge cases where lexical `this` binding is needed

Example of appropriate arrow function usage:
```tsx
'use client';

export function Component() {
  // Arrow function required for useCallback
  const handleClick = useCallback(() => {
    // handle logic
  }, []);

  // Arrow function required for useMemo
  const processedData = useMemo(() => {
    return heavyProcessing();
  }, []);

  return <div onClick={handleClick}>{processedData}</div>;
}
```

**Benefits of function declarations:**
- More readable and conventional
- Hoisted, allowing flexible code organization
- Clearer intent and function purpose
- Consistent with React component syntax
- Better stack traces in debugging

## Backend Integration

### Understand Before Building

Before implementing any new feature:

1. **Investigate the backend implementation**
   - Understand how the API endpoint works
   - Review the data flow and business logic
   - Check authentication and authorization requirements

2. **Review backend schemas**
   - Ensure frontend types match backend models
   - Validate data structures and field types
   - Maintain sync between frontend and backend types

3. **Consult with backend team** (if applicable)
   - Clarify any uncertainties about API behavior
   - Discuss data validation requirements
   - Coordinate changes that affect both frontend and backend

### Type Safety

Create TypeScript types that mirror backend schemas:

```tsx
// src/types/raffle.ts
export interface Raffle {
  id: string;
  title: string;
  description: string;
  maxParticipants: number;
  currentParticipants: number;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Code Formatting and Standards

### 1. Numeric Literals

**Use underscores (_) as separators for large numbers** to improve readability.

❌ **Avoid:**
```tsx
const MAX_SIZE = 5242880; // 5MB
const TIMEOUT = 30000; // 30 seconds
const PRICE = 1500000; // 1.5 million
```

✅ **Prefer:**
```tsx
const MAX_SIZE = 5_242_880; // 5MB
const TIMEOUT = 30_000; // 30 seconds
const PRICE = 1_500_000; // 1.5 million
```

**Benefits:**
- Easier to read large numbers at a glance
- Reduces errors when working with large values
- Standard practice in modern TypeScript/JavaScript

### 2. Package Manager

**Always use Bun for package management and script execution** instead of npm, yarn, or pnpm.

❌ **Avoid:**
```bash
npm install
npm run dev
npm test
```

✅ **Prefer:**
```bash
bun install
bun run dev
bun test
```

**Common Bun commands:**
- `bun add <package>` - Install package
- `bun remove <package>` - Remove package
- `bun install` - Install all dependencies
- `bun run <script>` - Run package.json script
- `bun test` - Run tests

### 3. Language and Localization

**All code, comments, documentation, and user-facing text must be written in English.**

This includes:
- Variable and function names
- Comments and JSDoc documentation
- Error messages
- User interface text
- Console logs
- Git commit messages

❌ **Avoid (non-English example):**
```tsx
// Comment in another language
function functionNameInAnotherLanguage() {
  return { error: 'Error message in another language' };
}
```

✅ **Prefer (English):**
```tsx
// Validates if the user is authenticated
function validateUser() {
  return { error: 'You must be signed in' };
}
```

**Rationale:**
- Maintains consistency across the codebase
- Enables international collaboration
- Standard practice in professional development
- Easier code review and maintenance

---

## Summary

Following these guidelines ensures:
- Secure and performant applications
- Maintainable and readable code
- Consistent patterns across the codebase
- Better collaboration between team members
- Easier onboarding for new developers

This document will be updated as new patterns and best practices emerge.
