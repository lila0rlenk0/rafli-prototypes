import { z } from 'zod';

/**
 * Schema for the raffle response from the backend
 * Represents the complete raffle object as returned by the API
 */
export const raffleSchema = z.object({
	id: z.string(),
	title: z.string(),
	description: z.string(),
	categoryId: z.string(),
	coverMediaUrl: z.string(),
	galleryMediaUrls: z.array(z.string()),
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
	status: z.enum([
		'cancelled',
		'completed',
		'draft',
		'ended',
		'live',
		'queued',
	]),
	publicSlugOrCode: z.string(),
	participantsCount: z.number(),
	ticketsSoldCount: z.number(),
	revenueAmount: z.string(),
	hostId: z.string(),
	drawId: z.number().optional(),
	raffleNumber: z.number().optional(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

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
});

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

export type Raffle = z.infer<typeof raffleSchema>;
export type CreateRaffleInput = z.infer<typeof createRaffleInputSchema>;
export type CreateRafflePayload = z.infer<typeof createRafflePayloadSchema>;

export const uploadCoverResponseSchema = z.object({
	coverMediaUrl: z.string(),
});

export const uploadGalleryResponseSchema = z.object({
	galleryMediaUrls: z.array(z.string()),
});

export type UploadCoverResponse = z.infer<typeof uploadCoverResponseSchema>;
export type UploadGalleryResponse = z.infer<typeof uploadGalleryResponseSchema>;
