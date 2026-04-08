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
	FULFILLING: 'fulfilling',
	LIVE: 'live',
	QUEUED: 'queued',
} as const;

/**
 * Statuses where hosts can post updates (communication still matters).
 * `ended` is intentionally excluded — winners are still being finalized.
 */
export const UPDATE_MANAGEABLE_STATUSES = [
	RAFFLE_STATUS.LIVE,
	RAFFLE_STATUS.FULFILLING,
	RAFFLE_STATUS.COMPLETED,
] as const;

export type UpdateManageableStatus =
	(typeof UPDATE_MANAGEABLE_STATUSES)[number];

/**
 * Statuses where participants can view and post comments.
 * Covers the full active-to-completed lifecycle — excludes draft/queued/cancelled.
 */
export const COMMENTABLE_STATUSES = [
	RAFFLE_STATUS.LIVE,
	RAFFLE_STATUS.ENDED,
	RAFFLE_STATUS.FULFILLING,
	RAFFLE_STATUS.COMPLETED,
] as const;

export type CommentableStatus = (typeof COMMENTABLE_STATUSES)[number];

/**
 * Statuses indicating a raffle has concluded (draw happened, lifecycle winding down).
 * Used to gate winner cards, fulfillment UI, and "not won" messaging.
 */
export const CONCLUDED_STATUSES = [
	RAFFLE_STATUS.ENDED,
	RAFFLE_STATUS.FULFILLING,
	RAFFLE_STATUS.COMPLETED,
] as const;

export type ConcludedStatus = (typeof CONCLUDED_STATUSES)[number];

/**
 * Statuses where promo code management is allowed (create/deactivate).
 * Concluded and cancelled raffles cannot have promos modified.
 */
export const PROMO_MANAGEABLE_STATUSES = [
	RAFFLE_STATUS.DRAFT,
	RAFFLE_STATUS.QUEUED,
	RAFFLE_STATUS.LIVE,
] as const;

export type PromoManageableStatus = (typeof PROMO_MANAGEABLE_STATUSES)[number];

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
	RAFFLE_STATUS.FULFILLING,
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

const hostSchema = z.object({
	id: z.uuid(),
	name: z.string().nullable(),
	username: z.string().nullable(),
	avatar: z.string().nullable(),
	totalRaffles: z.number().optional(),
});

/**
 * Schema for raffle winner info
 * Represents a winner entry returned by the API
 */
export const raffleWinnerSchema = z.object({
	oddsId: z.number().optional(),
	ticketCode: z.string().optional(),
	name: z.string().nullish(),
	position: z.number(),
	status: z.string(),
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
	coverMediaUrl: z.string().nullable(),
	/** Separate hero image optimized for featured card placement — falls back to coverMediaUrl when null */
	featuredCoverUrl: z.string().nullable().optional().catch(null),
	/** Admin-curated featured status — derived from featuredAt on the backend */
	isFeatured: z.boolean().optional().catch(false),
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
	status: raffleStatusSchema,
	publicSlugOrCode: z.string(),
	participantsCount: z.number(),
	ticketsSoldCount: z.number(),
	revenueAmount: z.string(),
	hostId: z.string(),
	drawId: z.number().optional(),
	raffleNumber: z.number().optional(),
	questionId: z.string().nullable(),
	createdAt: z.string(),
	updatedAt: z.string(),
	host: hostSchema.optional(),
	winners: z.array(raffleWinnerSchema).optional(),
	totalTicketsAtDraw: z.number().optional(),
	manifestHash: z.string().nullable().optional(),
	commitTxHash: z.string().nullable().optional(),
	vrfRequestId: z.string().nullable().optional(),
	vrfFulfillTxHash: z.string().nullable().optional(),
	/** Backend flag — true while draw process is running. Blocks cancellation even when status is still `live`. */
	isProcessingCompletion: z.boolean().optional(),
	disputeWindowEndsAt: z.string().nullable().optional(),
	/** Whether X/Twitter share free tickets are enabled for this raffle */
	xShareTicketsEnabled: z.boolean().optional(),
	/**
	 * User's X share claim state — only present when authenticated and xShareTicketsEnabled is true.
	 * `.catch(null)` degrades gracefully if backend shape changes.
	 */
	xShareClaim: z
		.object({
			claimId: z.string(),
			status: z.enum(['pending', 'verified', 'revoked', 'expired']),
			token: z.string().nullable(),
			expiresAt: z.string().nullable(),
		})
		.nullable()
		.optional()
		.catch(null),
	/** Whether user has hit the daily X share limit (one free ticket per UTC day) */
	xShareDailyLimitReached: z.boolean().optional(),
	/** ISO datetime when user can next claim an X share ticket — null if not rate-limited */
	xShareNextAvailableAt: z.string().nullable().optional(),
	/**
	 * Structured crypto payment options — null when raffle doesn't accept crypto.
	 * Backend computes per-chain selectable tokens with pricing, eliminating
	 * client-side filtering that previously lived in tokens.ts.
	 *
	 * `.catch(null)` ensures graceful degradation: if backend returns
	 * an older/incompatible shape, crypto is simply disabled for that raffle
	 * instead of failing the entire raffle list validation.
	 */
	cryptoOptions: z
		.object({
			chains: z.array(
				z.object({
					chainId: z.number(),
					/** Human-readable chain name from backend (e.g. 'Polygon Amoy', 'Arbitrum Sepolia') */
					name: z.string(),
					tokens: z.array(
						z.object({
							/** Unique token identifier (e.g. 'usdc', 'earnm') — sent to backend as `token` in checkout payload */
							tokenId: z.string(),
							/** Token ticker symbol for display (e.g. 'USDC', 'EARNM') */
							symbol: z.string(),
							/** Per-ticket price in token units — null for stablecoins (1:1 USD) */
							price: z.string().nullable(),
							/** ERC20 contract address on this chain */
							address: z.string(),
							/** Token decimal places (6 for USDC, 18 for EARNM) */
							decimals: z.number(),
							/** Whether this token is a stablecoin (1:1 USD pricing) */
							isStablecoin: z.boolean(),
						}),
					),
				}),
			),
		})
		.nullable()
		.catch(null),
});

/**
 * Schema for raffle cover image response
 * Returned by GET /raffles/:id/cover
 */
export const raffleCoverResponseSchema = z.object({
	raffleId: z.string(),
	cover: z.string().nullable(),
});

/**
 * Schema for raffle gallery response
 * Returned by GET /raffles/:id/gallery
 */
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
 * Schema for the payload sent to create a raffle
 *
 * This is a copy of BE schema to avoid conflicts
 */
export const createRafflePayloadSchema = z.object({
	categoryId: z.uuid(),
	questionId: z.uuid(),
	coverMediaUrl: z.string().max(500),
	/** Optional hero image for featured card placement — omit to default to null */
	featuredCoverUrl: z.string().max(500).optional(),
	declaredValueAmount: z.string().regex(/^\d+(\.\d{1,4})?$/),
	declaredValueCurrency: z.string().length(3),
	deliveryIncluded: z.boolean(),
	description: z.string().min(10).max(5_000),
	endAt: z.iso.datetime(),
	galleryMediaUrls: z.array(z.string().max(500)).max(10),
	hostId: z.uuid().optional(),
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
	declaredValueAmount: z
		.string()
		.regex(/^\d+(\.\d{1,4})?$/)
		.optional(),
	categoryId: z.uuid().optional(),
	questionId: z.uuid().optional(),
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

// ==========================================
// Inferred Types
// ==========================================

export type RaffleWinner = z.infer<typeof raffleWinnerSchema>;
export type Raffle = z.infer<typeof raffleSchema>;

/** Single token entry from a raffle's structured crypto options */
export type RaffleCryptoToken = NonNullable<
	Raffle['cryptoOptions']
>['chains'][number]['tokens'][number];

/** Structured crypto options from raffle — non-null subset for components that only render when crypto is enabled */
export type RaffleCryptoOptions = NonNullable<Raffle['cryptoOptions']>;

export type RaffleCoverResponse = z.infer<typeof raffleCoverResponseSchema>;
export type RaffleGalleryResponse = z.infer<typeof raffleGalleryResponseSchema>;
export type TokenPricingEntry = z.infer<typeof tokenPricingEntrySchema>;
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
 * Status can be a single status or multiple statuses separated by comma (e.g., "draft,queued" or "cancelled,completed,ended")
 * The API accepts comma-separated statuses, so we accept string here and let the API validate
 */
export const myRafflesQuerySchema = paginationQuerySchema.extend({
	category: z.string().optional(),
	sort: raffleSortOptionSchema.optional(),
	status: z.string().optional(), // Accepts single status or comma-separated statuses (validated by API)
});

/**
 * Schema for list raffles response (paginated raffles)
 */
export const listRafflesResponseSchema = paginationMetadataSchema.extend({
	raffles: z.array(raffleSchema),
});

/**
 * Schema for raffle with user's ticket count (participant mode)
 */
export const enrolledRaffleSchema = raffleSchema.extend({
	myTicketCount: z.number(),
});

/**
 * Schema for enrolled raffles list response
 */
export const listEnrolledRafflesResponseSchema =
	paginationMetadataSchema.extend({
		raffles: z.array(enrolledRaffleSchema),
	});

/**
 * Query schema for enrolled raffles (no category/question filters)
 */
export const enrolledRafflesQuerySchema = paginationQuerySchema.extend({
	sort: raffleSortOptionSchema.optional(),
	status: z.string().optional(),
});

// ==========================================
// Query Types
// ==========================================

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

/**
 * Union type for my-raffles page items
 */
export type MyRaffleItem = Raffle | EnrolledRaffle;

/**
 * Type guard for enrolled raffle
 * @param raffle - Raffle or EnrolledRaffle to check
 * @returns true if raffle has myTicketCount property
 */
export function isEnrolledRaffle(
	raffle: MyRaffleItem,
): raffle is EnrolledRaffle {
	return 'myTicketCount' in raffle;
}
