import { z } from 'zod';

import { tokenPricingEntrySchema } from './gallery';

/**
 * Client-side form input schema for the multi-step raffle creation wizard.
 *
 * Validation boundary: client-side only — this is the raw form shape.
 * The server action transforms this into `createRafflePayloadSchema` before API call.
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
	checkInQuestion: z.string(),
	timezone: z.string(),
	// Crypto payment config — mirrors form fields
	acceptsCrypto: z.boolean(),
	cryptoChainIds: z.array(z.number()),
	cryptoTokens: z.array(z.string()),
	cryptoTokenPricing: z.array(tokenPricingEntrySchema),
});

/** Reusable crypto input fields shared by create and update payload schemas */
const cryptoPayloadFields = {
	/** Whether this raffle accepts crypto payments */
	acceptsCrypto: z.boolean().optional(),
	/** EVM chain IDs to restrict. Empty array = all supported chains allowed. */
	cryptoChainIds: z.array(z.number().int().positive()).optional(),
	/** Token IDs to restrict (lowercased). Empty array = all tokens allowed. */
	cryptoTokens: z.array(z.string().min(1).max(20)).optional(),
	/** Per-ticket pricing for non-stablecoin tokens. Required when non-stablecoins are in `cryptoTokens`. */
	cryptoTokenPricing: z.array(tokenPricingEntrySchema).optional(),
};

/**
 * Schema for the payload sent to POST /raffles — creates a new raffle.
 *
 * Validation boundary: both — client-side safeParse in the create form,
 * then server-side strip/transform in the server action before forwarding to API.
 * Mirrors BE schema constraints to catch errors early on the client.
 */
export const createRafflePayloadSchema = z.object({
	categoryId: z.uuidv7(),
	questionId: z.uuidv7(),
	coverMediaUrl: z.string().max(500),
	/** Optional hero image for featured card placement — omit to default to null */
	featuredCoverUrl: z.string().max(500).optional(),
	declaredValueAmount: z.string().regex(/^\d+(\.\d{1,4})?$/),
	declaredValueCurrency: z.string().length(3),
	deliveryIncluded: z.boolean(),
	description: z.string().min(10).max(5_000),
	endAt: z.iso.datetime(),
	galleryMediaUrls: z.array(z.string().max(500)).max(10),
	// hostId omitted — mass-assignment: only the API may bind the host from the session
	maxParticipants: z.number().int().min(0).max(1_000_000),
	minParticipants: z.number().int().min(0),
	numberOfWinners: z.number().int().min(1).max(100),
	startAt: z.iso.datetime(),
	ticketPriceAmount: z.string().regex(/^\d+(\.\d{1,4})?$/),
	ticketPriceCurrency: z.string().length(3),
	timezone: z.string().min(1).max(50).optional(),
	title: z.string().min(3).max(200),
	/** Whether X/Twitter share free tickets are enabled (defaults false on backend) */
	xShareTicketsEnabled: z.boolean().optional(),
	...cryptoPayloadFields,
});

/** All fields optional — only changed fields should be sent */
export const updateRafflePayloadSchema = z.object({
	title: z.string().min(3).max(200).optional(),
	description: z.string().min(10).max(5_000).optional(),
	declaredValueAmount: z
		.string()
		.regex(/^\d+(\.\d{1,4})?$/)
		.optional(),
	categoryId: z.uuidv7().optional(),
	questionId: z.uuidv7().optional(),
	startAt: z.iso.datetime().optional(),
	endAt: z.iso.datetime().optional(),
	ticketPriceAmount: z
		.string()
		.regex(/^\d+(\.\d{1,4})?$/)
		.optional(),
	numberOfWinners: z.number().int().min(1).max(100).optional(),
	minParticipants: z.number().int().min(0).optional(),
	maxParticipants: z.number().int().min(0).max(1_000_000).optional(),
	/** Optional hero image for featured card placement — send empty string to clear */
	featuredCoverUrl: z.string().max(500).optional(),
	/** Whether X/Twitter share free tickets are enabled */
	xShareTicketsEnabled: z.boolean().optional(),
	...cryptoPayloadFields,
});

export type CreateRaffleInput = z.infer<typeof createRaffleInputSchema>;
export type CreateRafflePayload = z.infer<typeof createRafflePayloadSchema>;
export type UpdateRafflePayload = z.infer<typeof updateRafflePayloadSchema>;
