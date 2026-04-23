import { z } from 'zod';

import { paginationMetadataSchema } from '../pagination';

export const raffleCoverResponseSchema = z.object({
	raffleId: z.string(),
	cover: z.string().nullable(),
});

export const raffleGalleryResponseSchema = paginationMetadataSchema.extend({
	raffleId: z.string(),
	gallery: z.array(z.string()),
});

/**
 * Schema for a single token pricing entry (non-stablecoin).
 * Backend requires one entry per non-stablecoin token in `cryptoTokens`.
 * Price string must be a positive decimal that doesn't exceed the token's on-chain decimals.
 */
export const tokenPricingEntrySchema = z.object({
	/** Lowercase token registry key (e.g. "earnm") */
	tokenId: z.string().min(1).max(20),
	/** Positive decimal string — per-ticket price in token units */
	price: z.string().regex(/^\d+(\.\d+)?$/),
});

/** Schema for cover image upload response — returned by POST /raffles/:id/cover */
export const uploadCoverResponseSchema = z.object({
	coverMediaUrl: z.string(),
});

/** Schema for gallery images upload response — returned by POST /raffles/:id/gallery */
export const uploadGalleryResponseSchema = z.object({
	galleryMediaUrls: z.array(z.string()),
});

export type RaffleCoverResponse = z.infer<typeof raffleCoverResponseSchema>;
export type RaffleGalleryResponse = z.infer<typeof raffleGalleryResponseSchema>;
export type TokenPricingEntry = z.infer<typeof tokenPricingEntrySchema>;
export type UploadCoverResponse = z.infer<typeof uploadCoverResponseSchema>;
export type UploadGalleryResponse = z.infer<typeof uploadGalleryResponseSchema>;
