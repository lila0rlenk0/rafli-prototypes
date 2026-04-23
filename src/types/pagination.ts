import { z } from 'zod';

/**
 * Pagination metadata returned by every paginated BE endpoint.
 * Compose into domain response schemas via `.extend()`.
 *
 * Validation boundary: server-side only — parsed from API responses
 * in server actions to catch backend contract drift.
 */
export const paginationMetadataSchema = z.object({
	limit: z.number(),
	page: z.number(),
	total: z.number(),
	totalPages: z.number(),
});

/**
 * Pagination query params accepted by paginated endpoints.
 * Compose into domain query schemas via `.extend()`.
 *
 * Validation boundary: client-side — validated before sending to API
 * to prevent invalid page/limit values from reaching the backend.
 */
export const paginationQuerySchema = z.object({
	limit: z.number().optional(),
	page: z.number().optional(),
});

/**
 * Cursor + limit (chat, some mobile-style feeds). Keep `limit` max aligned
 * with the backend cap — `conversationsListQuerySchema` extends this.
 */
export const cursorPaginationQuerySchema = z.object({
	cursor: z.string().optional(),
	limit: z.number().int().min(1).max(50).optional(),
});

/** Pagination metadata shape returned in paginated responses. */
export type PaginationMetadata = z.infer<typeof paginationMetadataSchema>;
/** Pagination query params for paginated list requests. */
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type CursorPaginationQuery = z.infer<typeof cursorPaginationQuerySchema>;
