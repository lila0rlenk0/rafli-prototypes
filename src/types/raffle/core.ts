import { z } from 'zod';

import { enrollmentModeSchema, winnerSelectionModeSchema } from './payloads';

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

export type RaffleStatus = (typeof RAFFLE_STATUS)[keyof typeof RAFFLE_STATUS];

export type RaffleSortOption =
	(typeof RAFFLE_SORT_OPTION)[keyof typeof RAFFLE_SORT_OPTION];

export const raffleStatusSchema = z.enum([
	RAFFLE_STATUS.CANCELLED,
	RAFFLE_STATUS.COMPLETED,
	RAFFLE_STATUS.DRAFT,
	RAFFLE_STATUS.ENDED,
	RAFFLE_STATUS.FULFILLING,
	RAFFLE_STATUS.LIVE,
	RAFFLE_STATUS.QUEUED,
]);

export const raffleSortOptionSchema = z.enum([
	RAFFLE_SORT_OPTION.ENDING_SOON,
	RAFFLE_SORT_OPTION.LOWEST_PRICE,
	RAFFLE_SORT_OPTION.NEWEST,
	RAFFLE_SORT_OPTION.TRENDING,
]);

const hostSchema = z.object({
	id: z.uuidv7(),
	name: z.string().nullable(),
	username: z.string().nullable(),
	avatar: z.string().nullable(),
	totalRaffles: z.number().optional(),
});

export const raffleWinnerSchema = z.object({
	oddsId: z.number().optional(),
	ticketCode: z.string().optional(),
	name: z.string().nullish(),
	position: z.number(),
	status: z.string(),
});

/**
 * Core raffle entity schema — the most-used schema in the codebase.
 *
 * Validation boundary: server-side — parsed in every raffle-fetching server action.
 * `.catch()` on optional fields ensures graceful degradation when backend
 * adds new fields or changes optional field shapes.
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
	/** Immutable gallery URLs — components should never mutate this array directly */
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
	/** Threshold floor for total entries sold. 0 = disabled. `.catch(0)` keeps older cached responses parseable. */
	minTickets: z.number().catch(0),
	/** Per-user ticket cap. 0 = unlimited; backend ceiling is 1000. Optional + `.catch(0)` keeps older cached responses parseable. */
	maxTicketsPerUser: z.number().optional().catch(0),
	/** Winner selection mode — `unique_user` default. Immutable once the raffle leaves draft; the edit form surfaces it while still draft. */
	winnerSelectionMode: winnerSelectionModeSchema
		.optional()
		.catch('unique_user'),
	/** Enrollment mode — `standard` default; `wallet` gates programmatic enrollment. Immutable once the raffle leaves draft. */
	enrollmentMode: enrollmentModeSchema.optional().catch('standard'),
	deliveryIncluded: z.boolean(),
	status: raffleStatusSchema,
	publicSlugOrCode: z.string(),
	participantsCount: z.number(),
	ticketsSoldCount: z.number(),
	revenueAmount: z.string(),
	hostId: z.string(),
	/** On-chain draw identifier — backend maps from DB `draw_id` column */
	onChainId: z.number().optional(),
	raffleNumber: z.number().optional(),
	questionId: z.string().nullable(),
	createdAt: z.string(),
	updatedAt: z.string(),
	host: hostSchema.optional(),
	/** Draw winners — readonly, populated only after raffle concludes */
	winners: z.array(raffleWinnerSchema).optional(),
	totalTicketsAtDraw: z.number().optional(),
	manifestHash: z.string().nullable().optional(),
	commitTxHash: z.string().nullable().optional(),
	vrfRequestId: z.string().nullable().optional(),
	vrfFulfillTxHash: z.string().nullable().optional(),
	/**
	 * Backend-supplied cancellation reason — null for non-cancelled raffles.
	 * Replaces client-side heuristic inference. `.catch(null)` for backward compat
	 * with cached responses that may not have the field yet.
	 */
	cancellationReason: z
		.enum([
			'admin_rejected',
			'host_cancelled',
			'insufficient_participants',
			'no_tickets',
			'partial_participation',
		])
		.nullable()
		.optional()
		.catch(null),
	/** Backend flag — true while draw process is running. Blocks cancellation even when status is still `live`. */
	isProcessingCompletion: z.boolean().optional(),
	disputeWindowEndsAt: z.string().nullable().optional(),
	/** Whether X/Twitter share free tickets are enabled for this raffle */
	xShareTicketsEnabled: z.boolean().optional(),
	/**
	 * User's X share claim state — only present when authenticated and xShareTicketsEnabled is true.
	 *
	 * Backend status enum collapsed to `'pending' | 'verified'` after the lifetime-cap
	 * migration: a verify call always grants the ticket (UNIQUE(raffleId, userId) caps abuse),
	 * so revoked/expired no longer appear on the wire. `expiresAt` is non-null only while pending;
	 * pending claims past their `expiresAt` are rejected lazily at verify time, and a fresh
	 * `createXShareIntent` call refreshes the same row. `.catch(null)` degrades gracefully
	 * if backend shape changes.
	 */
	xShareClaim: z
		.object({
			claimId: z.string(),
			status: z.enum(['pending', 'verified']),
			token: z.string().nullable(),
			expiresAt: z.string().nullable(),
		})
		.nullable()
		.optional()
		.catch(null),
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

export type RaffleWinner = z.infer<typeof raffleWinnerSchema>;
export type Raffle = z.infer<typeof raffleSchema>;
export type RaffleCryptoToken = NonNullable<
	Raffle['cryptoOptions']
>['chains'][number]['tokens'][number];
export type RaffleCryptoOptions = NonNullable<Raffle['cryptoOptions']>;
