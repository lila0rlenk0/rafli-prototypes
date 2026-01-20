import { z } from 'zod';

import { paginationMetadataSchema, paginationQuerySchema } from './pagination';

// ==========================================
// Constants
// ==========================================

export const RAFFLE_STATUS = {
	CANCELLED: 'cancelled',
	COMPLETED: 'completed',
	DRAFT: 'draft',
	ENDED: 'ended',
	LIVE: 'live',
	QUEUED: 'queued',
} as const;

export const RAFFLE_SORT_OPTION = {
	ENDING_SOON: 'ending_soon',
	LOWEST_PRICE: 'lowest_price',
	NEWEST: 'newest',
	TRENDING: 'trending',
} as const;

// ==========================================
// Types
// ==========================================

/**
 * Represents the status of a raffle.
 */
export type RaffleStatus = (typeof RAFFLE_STATUS)[keyof typeof RAFFLE_STATUS];

/**
 * Represents the sorting options for raffles.
 */
export type RaffleSortOption =
	(typeof RAFFLE_SORT_OPTION)[keyof typeof RAFFLE_SORT_OPTION];

// ==========================================
// Schemas
// ==========================================

/**
 * Zod schema for RaffleStatus
 */
export const raffleStatusSchema = z.enum([
	RAFFLE_STATUS.CANCELLED,
	RAFFLE_STATUS.COMPLETED,
	RAFFLE_STATUS.DRAFT,
	RAFFLE_STATUS.ENDED,
	RAFFLE_STATUS.LIVE,
	RAFFLE_STATUS.QUEUED,
]);

/**
 * Zod schema for RaffleSortOption
 */
export const raffleSortOptionSchema = z.enum([
	RAFFLE_SORT_OPTION.ENDING_SOON,
	RAFFLE_SORT_OPTION.LOWEST_PRICE,
	RAFFLE_SORT_OPTION.NEWEST,
	RAFFLE_SORT_OPTION.TRENDING,
]);

/**
 * Schema for media URL with expiration
 * Represents a presigned URL that expires at a specific time
 */
const mediaUrlSchema = z.object({
	url: z.string(),
	expiresAt: z.string(),
});

const hostSchema = z.object({
	id: z.uuid(),
	name: z.string().nullable(),
	link: z.url().nullable(),
	avatar: z
		.object({
			expiresAt: z.string(),
			url: z.string(),
		})
		.nullable(),
	totalRaffles: z.number().optional(), // TODO: change to non optional once PR is merged
});

/**
 * Schema for the raffle response from the backend
 * Represents the complete raffle object as returned by the API
 */
export const raffleSchema = z.object({
	id: z.string(),
	title: z.string(),
	description: z.string(),
	categoryId: z.string(),
	coverMediaUrl: mediaUrlSchema.nullable(),
	galleryMediaUrls: z.array(mediaUrlSchema),
	declaredValueAmount: z.string(),
	declaredValueCurrency: z.string(),
	ticketPriceAmount: z.string(),
	ticketPriceCurrency: z.string(),
	startAt: z.string(),
	endAt: z.string(),
	timezone: z.string(),
	numberOfWinners: z.number(),
	minParticipants: z.number(),
	maxParticipants: z.number(),
	deliveryIncluded: z.boolean(),
	status: raffleStatusSchema,
	publicSlugOrCode: z.string(),
	participantsCount: z.number(),
	ticketsSoldCount: z.number(),
	revenueAmount: z.string(),
	hostId: z.string(),
	drawId: z.number().optional(),
	raffleNumber: z.number().optional(),
	createdAt: z.string(),
	updatedAt: z.string(),
	host: hostSchema.optional(),
});

/**
 * Schema for raffle cover image response
 * Returned by GET /raffles/:id/cover
 */
export const raffleCoverResponseSchema = z.object({
	raffleId: z.string(),
	cover: mediaUrlSchema.nullable(),
});

/**
 * Schema for raffle gallery response
 * Returned by GET /raffles/:id/gallery
 */
export const raffleGalleryResponseSchema = paginationMetadataSchema.extend({
	raffleId: z.string(),
	gallery: z.array(mediaUrlSchema),
});

/**
 * Schema for creating a raffle (input form)
 */
export const createRaffleInputSchema = z.object({
	title: z.string(),
	description: z.string(),
	price: z.number(),
	category: z.string(),
	startDate: z.string(),
	endDate: z.string(),
	pricePerTicket: z.number(),
	numberOfWinners: z.number(),
	minParticipants: z.number(),
	maxParticipants: z.number(),
	timezone: z.string(),
});

/**
 * Schema for the payload sent to create a raffle
 *
 * This is a copy of BE schema to avoid conflicts
 */
export const createRafflePayloadSchema = z.object({
	categoryId: z.uuid(),
	coverMediaUrl: z.string().max(500),
	declaredValueAmount: z.string().regex(/^\d+(\.\d{1,4})?$/),
	declaredValueCurrency: z.string().length(3),
	deliveryIncluded: z.boolean(),
	description: z.string().min(10).max(5_000),
	endAt: z.iso.datetime(),
	galleryMediaUrls: z.array(z.string().max(500)).max(10),
	hostId: z.uuid().optional(),
	maxParticipants: z.number().int().min(1).max(1_000_000),
	minParticipants: z.number().int().min(0),
	numberOfWinners: z.number().int().min(1).max(100),
	startAt: z.iso.datetime(),
	ticketPriceAmount: z.string().regex(/^\d+(\.\d{1,4})?$/),
	ticketPriceCurrency: z.string().length(3),
	timezone: z.string().min(1).max(50).optional(),
	title: z.string().min(3).max(200),
});

export const uploadCoverResponseSchema = z.object({
	coverMediaUrl: z.string(),
});

export const uploadGalleryResponseSchema = z.object({
	galleryMediaUrls: z.array(z.string()),
});

/**
 * Schema for the payload sent to update a raffle (partial update)
 * All fields are optional - only changed fields should be sent
 */
export const updateRafflePayloadSchema = z.object({
	title: z.string().min(3).max(200).optional(),
	description: z.string().min(10).max(5_000).optional(),
	declaredValueAmount: z.string().regex(/^\d+(\.\d{1,4})?$/).optional(),
	categoryId: z.uuid().optional(),
	startAt: z.iso.datetime().optional(),
	endAt: z.iso.datetime().optional(),
	ticketPriceAmount: z.string().regex(/^\d+(\.\d{1,4})?$/).optional(),
	numberOfWinners: z.number().int().min(1).max(100).optional(),
	minParticipants: z.number().int().min(0).optional(),
	maxParticipants: z.number().int().min(0).max(1_000_000).optional(),
});

// ==========================================
// Inferred Types
// ==========================================

export type SignedMediaUrl = z.infer<typeof mediaUrlSchema>;
export type Raffle = z.infer<typeof raffleSchema>;
export type RaffleCoverResponse = z.infer<typeof raffleCoverResponseSchema>;
export type RaffleGalleryResponse = z.infer<typeof raffleGalleryResponseSchema>;
export type CreateRaffleInput = z.infer<typeof createRaffleInputSchema>;
export type CreateRafflePayload = z.infer<typeof createRafflePayloadSchema>;
export type UpdateRafflePayload = z.infer<typeof updateRafflePayloadSchema>;
export type UploadCoverResponse = z.infer<typeof uploadCoverResponseSchema>;
export type UploadGalleryResponse = z.infer<typeof uploadGalleryResponseSchema>;

// ==========================================
// Query Schemas
// ==========================================

/**
 * Schema for querying raffles with filters and pagination
 */
export const myRafflesQuerySchema = paginationQuerySchema.extend({
	category: z.string().optional(),
	sort: raffleSortOptionSchema.optional(),
	status: raffleStatusSchema.optional(),
});

/**
 * Schema for list raffles response (paginated raffles)
 */
export const listRafflesResponseSchema = paginationMetadataSchema.extend({
	raffles: z.array(raffleSchema),
});

// ==========================================
// Query Types
// ==========================================

export type MyRafflesQuery = z.infer<typeof myRafflesQuerySchema>;
export type ListRafflesResponse = z.infer<typeof listRafflesResponseSchema>;
