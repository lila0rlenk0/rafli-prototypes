import { z } from 'zod';

// ==========================================
// Schemas
// ==========================================

/**
 * Schema for pagination metadata
 * Used for paginated API responses
 */
export const paginationMetadataSchema = z.object({
	limit: z.number(),
	page: z.number(),
	total: z.number(),
	totalPages: z.number(),
});

/**
 * Schema for pagination query parameters
 * Used for requesting paginated data
 */
export const paginationQuerySchema = z.object({
	limit: z.number().optional(),
	page: z.number().optional(),
});

// ==========================================
// Inferred Types
// ==========================================

export type PaginationMetadata = z.infer<typeof paginationMetadataSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
