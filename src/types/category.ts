import { z } from 'zod';

// ==========================================
// Schemas
// ==========================================

/**
 * Schema for category from backend
 */
export const categorySchema = z.object({
	id: z.string(),
	name: z.string(),
	slug: z.string(),
	description: z.string().nullable(),
	isActive: z.boolean(),
	sortOrder: z.number(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

/**
 * Schema for categories response from backend
 */
export const categoriesResponseSchema = z.object({
	categories: z.array(categorySchema),
	total: z.number(),
});

// ==========================================
// Inferred Types
// ==========================================

export type Category = z.infer<typeof categorySchema>;
export type CategoriesResponse = z.infer<typeof categoriesResponseSchema>;
