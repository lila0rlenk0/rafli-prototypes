import { describe, expect, test } from 'bun:test';

import type { Raffle } from '@/types/raffle';

import {
	deriveRaffleViewState,
	type RaffleViewState,
} from './raffle-page-derived';
import type { RaffleDetailPublic } from './raffle-page-loader';

const HOST_ID = 'host-0000-0000-0000';
const OTHER_USER_ID = 'user-1111-1111-1111';

/** Cast-only minimal `Raffle` for derivation tests. */
function buildRaffle(overrides: Partial<Raffle> = {}): Raffle {
	return {
		id: 'raffle-1',
		title: 'Test raffle',
		description: '',
		categoryId: 'cat-1',
		coverMediaUrl: null,
		galleryMediaUrls: [],
		declaredValueAmount: '1000',
		declaredValueCurrency: 'USD',
		ticketPriceAmount: '5',
		ticketPriceCurrency: 'USD',
		startAt: '2025-01-01T00:00:00.000Z',
		endAt: '2025-02-01T00:00:00.000Z',
		timezone: 'UTC',
		numberOfWinners: 1,
		minParticipants: 10,
		maxParticipants: 100,
		deliveryIncluded: false,
		status: 'live',
		publicSlugOrCode: 'test-raffle',
		participantsCount: 20,
		ticketsSoldCount: 20,
		revenueAmount: '100',
		hostId: HOST_ID,
		questionId: null,
		createdAt: '2025-01-01T00:00:00.000Z',
		updatedAt: '2025-01-01T00:00:00.000Z',
		cryptoOptions: null,
		...overrides,
	} as Raffle;
}

function asPublicRead(raffle: Raffle): RaffleDetailPublic {
	return { raffle, categories: [] };
}

function derive(
	raffle: Raffle,
	currentUserId: string | null = null,
): RaffleViewState {
	return deriveRaffleViewState({ read: asPublicRead(raffle), currentUserId });
}

describe('deriveRaffleViewState — guest on a live raffle', () => {
	const raffle = buildRaffle({ status: 'live' });
	const view = derive(raffle, null);

	test('is not concluded, not cancelled, no winners', () => {
		expect(view.isConcluded).toBe(false);
		expect(view.isCancelled).toBe(false);
		expect(view.hasWinners).toBe(false);
	});

	test('is not owner and can buy — no host-only affordances', () => {
		expect(view.isOwner).toBe(false);
		expect(view.showEditButton).toBe(false);
		expect(view.disablePurchase).toBe(false);
	});

	test('shows active card, share marquee, and KYC notice', () => {
		expect(view.showActiveCard).toBe(true);
		expect(view.showShareMarquee).toBe(true);
		expect(view.showKycNotice).toBe(true);
	});

	test('no terminal cards surface on a live raffle', () => {
		expect(view.showHostFulfillment).toBe(false);
		expect(view.showDrawInProgress).toBe(false);
		expect(view.showCancelledCard).toBe(false);
	});

	test('updates, comments, and promos are manageable while live', () => {
		expect(view.canManageUpdates).toBe(true);
		expect(view.isCommentable).toBe(true);
		expect(view.isPromoManageable).toBe(true);
	});

	test('skips the KYC winner fetch for a non-concluded raffle', () => {
		expect(view.shouldFetchKycStatus).toBe(false);
	});

	test('exposes numeric derivations the columns need', () => {
		expect(view.availableTickets).toBe(80);
		expect(view.ticketPrice).toBe(5);
		expect(view.cancellationReason).toBeNull();
	});
});

describe('deriveRaffleViewState — sold-out raffle still live', () => {
	test('reports zero available tickets without flipping any status flag', () => {
		const view = derive(
			buildRaffle({ participantsCount: 100, maxParticipants: 100 }),
		);
		expect(view.availableTickets).toBe(0);
		expect(view.showActiveCard).toBe(true);
	});

	test('never returns a negative available-tickets count when data drifts', () => {
		const view = derive(
			buildRaffle({ participantsCount: 150, maxParticipants: 100 }),
		);
		expect(view.availableTickets).toBe(0);
	});
});

describe('deriveRaffleViewState — draft status', () => {
	test('exposes edit affordance to the host and disables purchase', () => {
		const view = derive(buildRaffle({ status: 'draft' }), HOST_ID);
		expect(view.isOwner).toBe(true);
		expect(view.showEditButton).toBe(true);
		expect(view.disablePurchase).toBe(false);
	});

	test('hides the edit button for non-host visitors on a draft raffle', () => {
		const view = derive(buildRaffle({ status: 'draft' }), OTHER_USER_ID);
		expect(view.showEditButton).toBe(false);
		expect(view.isOwner).toBe(false);
	});

	test('keeps promo/updates/comments manageable per the status tuples', () => {
		const view = derive(buildRaffle({ status: 'draft' }));
		expect(view.isPromoManageable).toBe(true);
		expect(view.canManageUpdates).toBe(false);
		expect(view.isCommentable).toBe(false);
	});
});

describe('deriveRaffleViewState — host on own live raffle', () => {
	test('disables purchase without hiding the active card', () => {
		const view = derive(buildRaffle({ status: 'live' }), HOST_ID);
		expect(view.isOwner).toBe(true);
		expect(view.disablePurchase).toBe(true);
		expect(view.showActiveCard).toBe(true);
	});
});

describe('deriveRaffleViewState — ended without winners', () => {
	test('promotes the draw-in-progress card and hides the share marquee', () => {
		const view = derive(buildRaffle({ status: 'ended', winners: [] }));
		expect(view.showDrawInProgress).toBe(true);
		expect(view.showActiveCard).toBe(false);
		expect(view.showShareMarquee).toBe(false);
		expect(view.isConcluded).toBe(true);
	});

	test('stays in draw-in-progress while status is fulfilling without winners', () => {
		const view = derive(buildRaffle({ status: 'fulfilling', winners: [] }));
		expect(view.showDrawInProgress).toBe(true);
	});
});

const CONCLUDED_WINNER = buildRaffle({
	status: 'completed',
	winners: [{ position: 1, status: 'pending', ticketCode: 'T-1' }],
});

describe('deriveRaffleViewState — concluded with winners', () => {
	test('gates the KYC winner fetch on concluded status', () => {
		const view = derive(CONCLUDED_WINNER);
		expect(view.shouldFetchKycStatus).toBe(true);
		expect(view.isConcluded).toBe(true);
		expect(view.hasWinners).toBe(true);
	});

	test('shows the host fulfillment surface to the raffle host', () => {
		const view = derive(CONCLUDED_WINNER, HOST_ID);
		expect(view.isOwner).toBe(true);
		expect(view.showHostFulfillment).toBe(true);
	});

	test('hides the host fulfillment surface from non-host viewers', () => {
		const view = derive(CONCLUDED_WINNER, OTHER_USER_ID);
		expect(view.showHostFulfillment).toBe(false);
	});

	test('shuts off the active card + share marquee once concluded', () => {
		const view = derive(CONCLUDED_WINNER);
		expect(view.showActiveCard).toBe(false);
		expect(view.showShareMarquee).toBe(false);
		expect(view.showKycNotice).toBe(false);
	});
});

describe('deriveRaffleViewState — cancelled raffle', () => {
	test('surfaces the backend cancellation reason and cancelled-card flag', () => {
		const view = derive(
			buildRaffle({
				status: 'cancelled',
				cancellationReason: 'host_cancelled',
			}),
		);
		expect(view.isCancelled).toBe(true);
		expect(view.cancellationReason).toBe('host_cancelled');
		expect(view.showCancelledCard).toBe(true);
		expect(view.showActiveCard).toBe(false);
		expect(view.showKycNotice).toBe(false);
	});
});
