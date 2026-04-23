import { z } from 'zod';

import { paginationMetadataSchema, paginationQuerySchema } from '../pagination';

import { raffleSchema, raffleSortOptionSchema, type Raffle } from './core';

/**
 * Status can be a single value or comma-separated (e.g., "draft,queued").
 * Accepts string here — the API validates the individual values.
 */
export const myRafflesQuerySchema = paginationQuerySchema.extend({
	category: z.string().optional(),
	sort: raffleSortOptionSchema.optional(),
	// accepts single status or comma-separated statuses (validated by API)
	status: z.string().optional(),
});

export const listRafflesResponseSchema = paginationMetadataSchema.extend({
	raffles: z.array(raffleSchema),
});

/** Raffle with user's ticket count — participant mode */
export const enrolledRaffleSchema = raffleSchema.extend({
	myTicketCount: z.number(),
});

export const listEnrolledRafflesResponseSchema =
	paginationMetadataSchema.extend({
		raffles: z.array(enrolledRaffleSchema),
	});

export const enrolledRafflesQuerySchema = paginationQuerySchema.extend({
	sort: raffleSortOptionSchema.optional(),
	status: z.string().optional(),
});

export type MyRafflesQuery = z.infer<typeof myRafflesQuerySchema>;
export type ListRafflesResponse = z.infer<typeof listRafflesResponseSchema>;

/** Response for GET /api/v1/raffles/featured — always 0-2 items, no pagination */
export const featuredRafflesResponseSchema = z.object({
	raffles: z.array(raffleSchema),
});
export type FeaturedRafflesResponse = z.infer<
	typeof featuredRafflesResponseSchema
>;
export type EnrolledRaffle = z.infer<typeof enrolledRaffleSchema>;
export type ListEnrolledRafflesResponse = z.infer<
	typeof listEnrolledRafflesResponseSchema
>;
export type EnrolledRafflesQuery = z.infer<typeof enrolledRafflesQuerySchema>;

export type MyRaffleItem = Raffle | EnrolledRaffle;
