/**
 * Page size for the /past-winners archive — shared by the Server Component
 * that SSRs page 1 and the client React Query hook that fetches subsequent
 * pages. Lives in its own module (no `'use client'` / `'use server'` directive)
 * because Next wraps every export from a `'use client'` module as a client
 * reference at build time — a Server Component reading the constant would
 * serialize the RSC reference function instead of the number, causing the
 * backend to reject the request with a 400 (limit: expected a number).
 *
 * Matches backend `PAST_WINNERS_DEFAULT_LIMIT = 20` (winning.dto.ts). Keep in
 * sync: diverging would make React Query treat the server-seeded first page
 * as "incomplete" and fire an unnecessary refetch on mount.
 */
export const PAST_WINNERS_PAGE_SIZE = 20;
