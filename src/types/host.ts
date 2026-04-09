import { z } from 'zod';

import { paginationQuerySchema } from './pagination';

/**
 * Host public profile entity.
 *
 * Validation boundary: server-side — parsed in host profile server actions.
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

export type HostProfile = z.infer<typeof hostProfileSchema>;

/**
 * Either hostId or username must be provided — the API uses whichever is present.
 *
 * Validation boundary: client-side — validated before fetching host raffles.
 */
export const hostRafflesQuerySchema = paginationQuerySchema.extend({
	hostId: z.uuid().optional(),
	username: z.string().optional(),
	status: z.string().optional(),
});

export type HostRafflesQuery = z.infer<typeof hostRafflesQuerySchema>;
