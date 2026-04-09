import { z } from 'zod';

import { paginationMetadataSchema, paginationQuerySchema } from './pagination';

// ==========================================
// Schemas
// ==========================================

/**
 * Schema for a single ticket code item.
 * Represents a human-friendly ticket code with issuance source and optional receipt link.
 *
 * source: issuance origin — 'purchase', 'promo', 'x_share', 'wallet', 'partner:{id}'
 * receiptUrl: Stripe receipt or block explorer link — null for non-payment sources
 */
export const ticketCodeSchema = z.object({
	ticketCode: z.string(),
	raffleId: z.string(),
	source: z.string(),
	receiptUrl: z.string().nullable(),
	createdAt: z.string(),
});

/**
 * Schema for ticket code query parameters
 * Used when fetching paginated ticket codes
 */
export const ticketCodesQuerySchema = paginationQuerySchema.extend({
	raffleId: z.string().optional(),
});

/**
 * Schema for ticket codes response
 * Returned by GET /me/ticket-codes
 */
export const ticketCodesResponseSchema = paginationMetadataSchema.extend({
	tickets: z.array(ticketCodeSchema),
});

/**
 * Schema for a single ledger entry
 * Represents a ticket acquisition event
 */
export const ticketLedgerEntrySchema = z.object({
	raffleId: z.string(),
	amount: z.number(),
	source: z.string(),
	createdAt: z.string(),
});

/**
 * Schema for ticket balance per raffle.
 * Two modes:
 * - With raffleId param: entries populated with individual ledger rows.
 * - Without raffleId (aggregate): entries is empty [], only totals returned.
 */
export const ticketBalanceSchema = z.object({
	raffleId: z.string(),
	totalTickets: z.number(),
	entries: z.array(ticketLedgerEntrySchema), // empty in aggregate mode (no raffleId param)
});

/**
 * Schema for tickets query parameters
 * Used when fetching user ticket balances
 * Optional raffleId returns individual ledger entries for that raffle;
 * omitting it returns aggregate balances with entries: []
 */
export const ticketsQuerySchema = paginationQuerySchema.extend({
	raffleId: z.string().optional(),
});

/**
 * Schema for tickets response
 * Returned by GET /me/tickets
 * Includes pagination metadata — totalRaffles is the domain-specific total count
 */
export const ticketsResponseSchema = paginationMetadataSchema.extend({
	balances: z.array(ticketBalanceSchema),
	totalRaffles: z.number(),
});

// ==========================================
// Inferred Types
// ==========================================

export type TicketCode = z.infer<typeof ticketCodeSchema>;
export type TicketCodesQuery = z.infer<typeof ticketCodesQuerySchema>;
export type TicketCodesResponse = z.infer<typeof ticketCodesResponseSchema>;
export type TicketLedgerEntry = z.infer<typeof ticketLedgerEntrySchema>;
export type TicketBalance = z.infer<typeof ticketBalanceSchema>;
export type TicketsQuery = z.infer<typeof ticketsQuerySchema>;
export type TicketsResponse = z.infer<typeof ticketsResponseSchema>;
