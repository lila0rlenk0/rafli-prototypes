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

## Component Development

### 1. Logic Extraction from JSX

**Avoid inline logic in JSX.** Extract calculations, transformations, and data formatting into dedicated functions.

❌ **Bad Practice:**
```tsx
<div>{user.name}</div>
<div>{raffle.maxParticipants.toLocaleString()}</div>
```

✅ **Good Practice:**
```tsx
const userName = getUserDisplayName(user);
const formattedMaxParticipants = formatParticipantCount(raffle.maxParticipants);

return (
  <div>{userName}</div>
  <div>{formattedMaxParticipants}</div>
);
```

**Benefits:**
- Easier maintenance and debugging
- Simpler testing of logic in isolation
- Better readability and code reusability
- Facilitates future modifications

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

## Summary

Following these guidelines ensures:
- Secure and performant applications
- Maintainable and readable code
- Consistent patterns across the codebase
- Better collaboration between team members
- Easier onboarding for new developers

This document will be updated as new patterns and best practices emerge.
