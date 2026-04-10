import { describe, expect, test } from 'bun:test';

import { raffleSchema, raffleWinnerSchema } from './raffle';
import { winningStatusSchema } from './winning';

/**
 * Schema alignment tests — verify frontend Zod schemas accept
 * the exact shapes returned by raffles-core-backend.
 *
 * These tests catch contract drift between frontend and backend
 * before it causes silent data loss (.catch/optional swallowing fields).
 */

/** Minimal valid raffle from backend — only required fields */
function buildBackendRaffle(overrides: Record<string, unknown> = {}) {
	return {
		id: '550e8400-e29b-41d4-a716-446655440000',
		title: 'Test Raffle',
		description: 'A test raffle for schema alignment',
		categoryId: '550e8400-e29b-41d4-a716-446655440001',
		coverMediaUrl: null,
		galleryMediaUrls: [],
		declaredValueAmount: '100.00',
		declaredValueCurrency: 'USD',
		ticketPriceAmount: '5.00',
		ticketPriceCurrency: 'USD',
		startAt: '2026-01-01T00:00:00Z',
		endAt: '2026-02-01T00:00:00Z',
		timezone: 'UTC',
		numberOfWinners: 1,
		minParticipants: 5,
		maxParticipants: 100,
		deliveryIncluded: true,
		status: 'live',
		publicSlugOrCode: 'test-raffle-abc',
		participantsCount: 10,
		ticketsSoldCount: 15,
		revenueAmount: '75.00',
		hostId: '550e8400-e29b-41d4-a716-446655440002',
		questionId: null,
		createdAt: '2026-01-01T00:00:00Z',
		updatedAt: '2026-01-01T00:00:00Z',
		...overrides,
	};
}

describe('raffleSchema backend alignment', () => {
	test('parses cancellationReason field from backend', () => {
		// Backend returns cancellationReason as a direct field on cancelled raffles.
		// Frontend must include it in the schema, not rely on heuristic inference.
		const raffle = buildBackendRaffle({
			status: 'cancelled',
			cancellationReason: 'admin_rejected',
		});

		const result = raffleSchema.safeParse(raffle);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.cancellationReason).toBe('admin_rejected');
		}
	});

	test('parses all backend cancellation reasons', () => {
		const reasons = [
			'admin_rejected',
			'host_cancelled',
			'insufficient_participants',
			'no_tickets',
			'partial_participation',
		];

		for (const reason of reasons) {
			const raffle = buildBackendRaffle({
				status: 'cancelled',
				cancellationReason: reason,
			});
			const result = raffleSchema.safeParse(raffle);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.cancellationReason).toBe(reason);
			}
		}
	});

	test('parses null cancellationReason for non-cancelled raffles', () => {
		const raffle = buildBackendRaffle({ cancellationReason: null });

		const result = raffleSchema.safeParse(raffle);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.cancellationReason).toBeNull();
		}
	});

	test('parses onChainId field from backend (mapped from drawId)', () => {
		// Backend returns onChainId (not drawId). Frontend schema must accept it.
		const raffle = buildBackendRaffle({ onChainId: 42 });

		const result = raffleSchema.safeParse(raffle);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.onChainId).toBe(42);
		}
	});

	test('parses xShareClaim with backend "completed" status', () => {
		// Backend uses 'completed', not 'verified'.
		const raffle = buildBackendRaffle({
			xShareClaim: {
				claimId: '550e8400-e29b-41d4-a716-446655440003',
				status: 'completed',
				token: null,
				expiresAt: null,
			},
		});

		const result = raffleSchema.safeParse(raffle);

		expect(result.success).toBe(true);
		if (result.success) {
			// Must not be silently nullified by .catch(null)
			expect(result.data.xShareClaim).not.toBeNull();
			expect(result.data.xShareClaim?.status).toBe('completed');
		}
	});
});

describe('raffleWinnerSchema', () => {
	test('parses minimal public winner (position + status only)', () => {
		// Backend public API strips winners to { position, status } only
		const winner = { position: 1, status: 'pending' };

		const result = raffleWinnerSchema.safeParse(winner);

		expect(result.success).toBe(true);
	});

	test('position is 0-indexed from backend', () => {
		// First-place winner has position=0 (0-indexed array index from VRF draw)
		const winner = { position: 0, status: 'pending' };

		const result = raffleWinnerSchema.safeParse(winner);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.position).toBe(0);
		}
	});
});

describe('winningStatusSchema backend alignment', () => {
	test('parses legacy pending_partial_fulfillment status', () => {
		// Backend DB has legacy records with this status.
		// Schema must accept it to avoid Zod parse failure on /me/winnings.
		const result = winningStatusSchema.safeParse('pending_partial_fulfillment');

		expect(result.success).toBe(true);
	});

	test('parses all active winning statuses', () => {
		const statuses = [
			'pending',
			'awaiting_host',
			'sent',
			'delivered',
			'received',
			'disputed',
			'resolved',
		];

		for (const status of statuses) {
			expect(winningStatusSchema.safeParse(status).success).toBe(true);
		}
	});
});
