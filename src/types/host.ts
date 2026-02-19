import { z } from 'zod';

import { paginationQuerySchema } from './pagination';

// ==========================================
// Schemas
// ==========================================

/**
 * Schema for host profile data
 * Represents the public profile of a raffle host
 */
export const hostProfileSchema = z.object({
	id: z.uuid(),
	name: z.string().nullable(),
	username: z.string().nullable(),
	bio: z.string().nullable(),
	image: z.string().nullable(),
	averageRating: z.number().nullable(),
	totalRafflesHosted: z.number(),
	totalReviews: z.number(),
});

// ==========================================
// Inferred Types
// ==========================================

export type HostProfile = z.infer<typeof hostProfileSchema>;

// ==========================================
// Query Schemas
// ==========================================

/**
 * Schema for querying host raffles
 * Either hostId or username must be provided
 */
export const hostRafflesQuerySchema = paginationQuerySchema.extend({
	hostId: z.uuid().optional(),
	username: z.string().optional(),
	status: z.string().optional(),
});

export type HostRafflesQuery = z.infer<typeof hostRafflesQuerySchema>;
