import { z } from 'zod';

/**
 * Raffle category entity — cached aggressively (TTL 3600s).
 *
 * Validation boundary: server-side — parsed in the `getCategories` server action.
 * Categories rarely change, so Zod validation cost is amortized by the long TTL.
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

/** Response from GET /categories — flat list with total count. */
export const categoriesResponseSchema = z.object({
	categories: z.array(categorySchema),
	total: z.number(),
});

/** Single raffle category. */
export type Category = z.infer<typeof categorySchema>;
/** Response shape for category listing endpoint. */
export type CategoriesResponse = z.infer<typeof categoriesResponseSchema>;
