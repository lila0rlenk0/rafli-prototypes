import { z } from 'zod';

import { paginationMetadataSchema, paginationQuerySchema } from './pagination';

// ==========================================
// Constants
// ==========================================

export const WINNING_STATUS = {
	PENDING: 'pending',
	/** Legacy status — no longer written by backend, but may exist in historical DB records */
	PENDING_PARTIAL_FULFILLMENT: 'pending_partial_fulfillment',
	AWAITING_HOST: 'awaiting_host',
	SENT: 'sent',
	DELIVERED: 'delivered',
	RECEIVED: 'received',
	DISPUTED: 'disputed',
	RESOLVED: 'resolved',
} as const;

export const CLAIM_TYPE = {
	SHIPPING: 'shipping',
} as const;

export type WinningStatus =
	(typeof WINNING_STATUS)[keyof typeof WINNING_STATUS];

export type ClaimType = (typeof CLAIM_TYPE)[keyof typeof CLAIM_TYPE];

export const winningStatusSchema = z.enum([
	WINNING_STATUS.PENDING,
	WINNING_STATUS.PENDING_PARTIAL_FULFILLMENT,
	WINNING_STATUS.AWAITING_HOST,
	WINNING_STATUS.SENT,
	WINNING_STATUS.DELIVERED,
	WINNING_STATUS.RECEIVED,
	WINNING_STATUS.DISPUTED,
	WINNING_STATUS.RESOLVED,
]);

// 'wallet' retained in the schema for backward-compat parsing of historical
// DB records — the backend DB enum still carries it for migration safety,
// but new claims are always 'shipping' (enforced by claimWinningPayloadSchema).
export const claimTypeSchema = z.enum(['shipping', 'wallet']);

export const shippingInfoSchema = z.object({
	name: z.string(),
	address: z.string(),
	city: z.string(),
	zip: z.string(),
	country: z.string(),
	// Backend JSONB field — may be omitted entirely (undefined) or explicitly null
	phone: z.string().optional().nullable(),
});

/**
 * Matches backend WinningResponseDto — full winning entity.
 *
 * Validation boundary: server-side — parsed in winning-related server actions.
 * Timestamp fields are nullable because they're populated progressively
 * as the winning moves through its lifecycle (claim → send → deliver → receive).
 */
export const winningSchema = z.object({
	id: z.string(),
	raffleId: z.string(),
	userId: z.string(),
	position: z.number(),
	status: winningStatusSchema,
	claimType: claimTypeSchema.nullable(),
	claimedAt: z.string().nullable(),
	sentAt: z.string().nullable(),
	deliveredAt: z.string().nullable(),
	receivedAt: z.string().nullable(),
	disputedAt: z.string().nullable(),
	resolvedAt: z.string().nullable(),
	shippingInfo: shippingInfoSchema.nullable(),
	proofUrl: z.string().nullable(),
	hostNotes: z.string().nullable(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

export const listWinningsResponseSchema = z.object({
	limit: z.number(),
	page: z.number(),
	total: z.number(),
	totalPages: z.number(),
	winnings: z.array(winningSchema),
});

/**
 * Claim winning payload — currently only shipping is supported.
 *
 * Validation boundary: client-side — validated in the claim form before server action call.
 */
export const claimWinningPayloadSchema = z.object({
	claimType: z.literal('shipping'),
	shippingInfo: z.object({
		name: z.string().min(1).max(100),
		address: z.string().min(1).max(500),
		city: z.string().min(1).max(100),
		zip: z.string().min(1).max(20),
		country: z.string().min(1).max(100),
		phone: z.string().max(30).nullable(),
	}),
});

export const markSentPayloadSchema = z.object({
	proofUrl: z
		.string()
		.url()
		.max(512)
		.refine(
			url => /^https?:\/\//i.test(url),
			'Only HTTP and HTTPS URLs are allowed',
		),
	hostNotes: z.string().max(2_000).optional(),
});

export type ShippingInfo = z.infer<typeof shippingInfoSchema>;
export type Winning = z.infer<typeof winningSchema>;
export type ListWinningsResponse = z.infer<typeof listWinningsResponseSchema>;
export type ClaimWinningPayload = z.infer<typeof claimWinningPayloadSchema>;
export type MarkSentPayload = z.infer<typeof markSentPayloadSchema>;

/**
 * Host's view of a winner — extends winningSchema with display fields.
 * Backend: HostWinnerDto extends WinningResponseDto.
 *
 * Validation boundary: server-side — parsed in host winning management server actions.
 */
export const hostWinnerEntrySchema = winningSchema.extend({
	userName: z.string().nullable(),
	userAvatar: z.string().nullable(),
});

export const hostRaffleWinningsResponseSchema = z.object({
	items: z.array(hostWinnerEntrySchema),
	limit: z.number(),
	page: z.number(),
	total: z.number(),
	totalPages: z.number(),
});

export type HostWinnerEntry = z.infer<typeof hostWinnerEntrySchema>;
export type HostRaffleWinningsResponse = z.infer<
	typeof hostRaffleWinningsResponseSchema
>;

// ==========================================
// Recent Winners (Public — homepage / browse strip + dedicated archive)
// ==========================================

/**
 * Public-facing winner entry for the "Most recent winners!" surface.
 *
 * Privacy boundary: the backend strips userId entirely and pre-masks the
 * display name to "First L." (e.g. "Anna T.", or "Deleted User" for purged
 * accounts). The schema therefore only carries publicly-safe fields — never
 * add userId here even if the API accidentally starts returning it.
 *
 * `prizeLabel` falls back to the raffle title when the raffle has no
 * `prizeTiers` configured; the backend resolves that fallback so the client
 * can render it verbatim.
 *
 * `ticketCode` is the winning ticket code — already public via
 * `/verify` deep-linking, included here as social proof.
 *
 * Backend also returns `winnerAvatar` on this DTO; we don't parse it because
 * no surface renders it (winners are identified by masked name only) and
 * Zod's default strip-mode silently drops unknown keys — keeping the schema
 * surface small also shrinks the RSC payload serialized into initial HTML.
 */
export const recentWinnerSchema = z.object({
	position: z.number(),
	prizeAmount: z.string(),
	prizeCurrency: z.string(),
	prizeLabel: z.string(),
	raffleId: z.string(),
	raffleSlug: z.string(),
	raffleTitle: z.string(),
	ticketCode: z.string(),
	winnerDisplayName: z.string(),
	wonAt: z.string(),
});

export const listRecentWinnersResponseSchema = z.object({
	winners: z.array(recentWinnerSchema),
});

/**
 * Query for GET /winnings/recent.
 * `limit` defaults server-side (currently 6, capped at 20) — omit to use
 * the backend default rather than hardcoding a value on the client.
 */
export const recentWinnersQuerySchema = z.object({
	limit: z.number().int().min(1).max(20).optional(),
});

export type RecentWinner = z.infer<typeof recentWinnerSchema>;
export type ListRecentWinnersResponse = z.infer<
	typeof listRecentWinnersResponseSchema
>;
export type RecentWinnersQuery = z.infer<typeof recentWinnersQuerySchema>;

// ==========================================
// Past Winners (Public — paginated archive for /past-winners page)
// ==========================================

/**
 * Paginated archive response — entry shape reused from `recentWinnerSchema`
 * so the /past-winners page can render the same winner row component as the
 * /browse homepage strip. Backend returns `RecentWinnerDto` verbatim inside
 * the pagination envelope (see `ListPastWinnersResponseDto` in
 * `winning.dto.ts` on the backend).
 *
 * Pagination envelope fields (`limit`, `page`, `total`, `totalPages`) match
 * the codebase-wide convention from `@/types/pagination`.
 */
export const listPastWinnersResponseSchema = paginationMetadataSchema.extend({
	winners: z.array(recentWinnerSchema),
});

/**
 * Query for GET /winnings/past. Backend cap is `PAST_WINNERS_MAX_LIMIT = 50`
 * (winning.dto.ts); default is 20. No additional filter params — archive
 * ordering is always `createdAt DESC`.
 */
export const pastWinnersQuerySchema = paginationQuerySchema;

export type ListPastWinnersResponse = z.infer<
	typeof listPastWinnersResponseSchema
>;
export type PastWinnersQuery = z.infer<typeof pastWinnersQuerySchema>;
