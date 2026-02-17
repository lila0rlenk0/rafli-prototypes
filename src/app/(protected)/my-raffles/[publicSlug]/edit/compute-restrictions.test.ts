import { describe, expect, test } from 'bun:test';

import { RAFFLE_STATUS } from '@/types/raffle';
import type { Raffle } from '@/types/raffle';

import { computeRestrictions } from './compute-restrictions';

/** Creates a minimal raffle for testing restrictions */
function makeRaffle(
	overrides: Partial<Pick<Raffle, 'status' | 'participantsCount' | 'startAt'>>,
): Raffle {
	return {
		id: 'test-id',
		title: 'Test Raffle',
		description: 'Test',
		categoryId: 'cat-1',
		coverMediaUrl: null,
		galleryMediaUrls: [],
		declaredValueAmount: '100',
		declaredValueCurrency: 'USD',
		ticketPriceAmount: '10',
		ticketPriceCurrency: 'USD',
		startAt: '2026-03-01T00:00:00Z',
		endAt: '2026-04-01T00:00:00Z',
		timezone: 'UTC',
		numberOfWinners: 1,
		minParticipants: 0,
		maxParticipants: 100,
		deliveryIncluded: false,
		status: RAFFLE_STATUS.DRAFT,
		publicSlugOrCode: 'test-slug',
		participantsCount: 0,
		ticketsSoldCount: 0,
		revenueAmount: '0',
		hostId: 'host-1',
		questionId: null,
		createdAt: '2026-02-01T00:00:00Z',
		updatedAt: '2026-02-01T00:00:00Z',
		...overrides,
	};
}

describe('computeRestrictions', () => {
	describe('startDateLocked', () => {
		test('unlocked for draft raffle with no participants', () => {
			const raffle = makeRaffle({ status: RAFFLE_STATUS.DRAFT });
			expect(computeRestrictions(raffle).startDateLocked).toBe(false);
		});

		test('unlocked for queued raffle with no participants', () => {
			const raffle = makeRaffle({ status: RAFFLE_STATUS.QUEUED });
			expect(computeRestrictions(raffle).startDateLocked).toBe(false);
		});

		test('locked for live raffle', () => {
			const raffle = makeRaffle({ status: RAFFLE_STATUS.LIVE });
			expect(computeRestrictions(raffle).startDateLocked).toBe(true);
		});

		test('locked for raffle with participants (any status)', () => {
			const raffle = makeRaffle({
				status: RAFFLE_STATUS.DRAFT,
				participantsCount: 5,
			});
			expect(computeRestrictions(raffle).startDateLocked).toBe(true);
		});

		test('locked for ended raffle with participants', () => {
			const raffle = makeRaffle({
				status: RAFFLE_STATUS.ENDED,
				participantsCount: 10,
			});
			expect(computeRestrictions(raffle).startDateLocked).toBe(true);
		});

		test('unlocked for ended raffle with no participants', () => {
			const raffle = makeRaffle({
				status: RAFFLE_STATUS.ENDED,
				participantsCount: 0,
			});
			expect(computeRestrictions(raffle).startDateLocked).toBe(false);
		});
	});

	describe('priceLocked', () => {
		test('unlocked when no participants', () => {
			const raffle = makeRaffle({ participantsCount: 0 });
			expect(computeRestrictions(raffle).priceLocked).toBe(false);
		});

		test('locked when has participants', () => {
			const raffle = makeRaffle({ participantsCount: 1 });
			expect(computeRestrictions(raffle).priceLocked).toBe(true);
		});
	});
});
