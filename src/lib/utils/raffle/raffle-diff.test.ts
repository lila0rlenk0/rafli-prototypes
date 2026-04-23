import { describe, expect, test } from 'bun:test';

import type { Raffle } from '@/types/raffle';

import { computeRaffleDiff, hasRaffleChanges } from './raffle-diff';

// ==========================================
// Fixtures
// ==========================================

// Minimal Raffle satisfying the fields diffScalarFields + diffCryptoFields access
const BASE_RAFFLE: Raffle = {
	id: 'raffle-1',
	title: 'Original Title',
	description: 'Original description',
	categoryId: 'cat-1',
	coverMediaUrl: null,
	galleryMediaUrls: [],
	declaredValueAmount: '100',
	declaredValueCurrency: 'USD',
	ticketPriceAmount: '5',
	ticketPriceCurrency: 'USD',
	startAt: '2026-06-01T10:00:00.000Z',
	endAt: '2026-06-15T10:00:00.000Z',
	timezone: 'America/New_York',
	numberOfWinners: 1,
	minParticipants: 10,
	maxParticipants: 100,
	deliveryIncluded: false,
	status: 'draft',
	publicSlugOrCode: 'original-title-abc12',
	participantsCount: 0,
	ticketsSoldCount: 0,
	revenueAmount: '0',
	hostId: 'host-1',
	questionId: 'q-1',
	createdAt: '2026-05-01T00:00:00.000Z',
	updatedAt: '2026-05-01T00:00:00.000Z',
	cryptoOptions: null,
};

// Form data matching the BASE_RAFFLE — no diff expected
const BASE_FORM = {
	title: 'Original Title',
	description: 'Original description',
	price: 100,
	category: 'Electronics',
	startDate: '2026-06-01',
	startTime: '10:00',
	endDate: '2026-06-15',
	endTime: '10:00',
	pricePerTicket: 5,
	numberOfWinners: 1,
	minParticipants: 10,
	maxParticipants: 100,
	checkInQuestion: 'What is your name?',
	acceptsCrypto: false,
	cryptoChainIds: [] as number[],
	cryptoTokens: [] as string[],
	cryptoTokenPricing: [] as { tokenId: string; price: string }[],
};

describe('computeRaffleDiff', () => {
	describe('no changes', () => {
		test('returns empty object when nothing changed', () => {
			const diff = computeRaffleDiff({
				original: BASE_RAFFLE,
				current: BASE_FORM,
				categoryId: 'cat-1',
				checkInQuestionId: 'q-1',
			});
			expect(diff).toEqual({});
		});
	});

	describe('scalar text fields', () => {
		test('detects title change', () => {
			const form = { ...BASE_FORM, title: 'New Title' };
			const diff = computeRaffleDiff({
				original: BASE_RAFFLE,
				current: form,
				categoryId: 'cat-1',
				checkInQuestionId: 'q-1',
			});
			expect(diff.title).toBe('New Title');
		});

		test('detects description change', () => {
			const form = { ...BASE_FORM, description: 'Updated desc' };
			const diff = computeRaffleDiff({
				original: BASE_RAFFLE,
				current: form,
				categoryId: 'cat-1',
				checkInQuestionId: 'q-1',
			});
			expect(diff.description).toBe('Updated desc');
		});
	});

	describe('numeric fields', () => {
		test('detects declared value change (form number vs API string)', () => {
			const form = { ...BASE_FORM, price: 200 };
			const diff = computeRaffleDiff({
				original: BASE_RAFFLE,
				current: form,
				categoryId: 'cat-1',
				checkInQuestionId: 'q-1',
			});
			expect(diff.declaredValueAmount).toBe('200');
		});

		test('detects ticket price change', () => {
			const form = { ...BASE_FORM, pricePerTicket: 10 };
			const diff = computeRaffleDiff({
				original: BASE_RAFFLE,
				current: form,
				categoryId: 'cat-1',
				checkInQuestionId: 'q-1',
			});
			expect(diff.ticketPriceAmount).toBe('10');
		});

		test('detects numberOfWinners change', () => {
			const form = { ...BASE_FORM, numberOfWinners: 3 };
			const diff = computeRaffleDiff({
				original: BASE_RAFFLE,
				current: form,
				categoryId: 'cat-1',
				checkInQuestionId: 'q-1',
			});
			expect(diff.numberOfWinners).toBe(3);
		});

		test('detects minParticipants change', () => {
			const form = { ...BASE_FORM, minParticipants: 5 };
			const diff = computeRaffleDiff({
				original: BASE_RAFFLE,
				current: form,
				categoryId: 'cat-1',
				checkInQuestionId: 'q-1',
			});
			expect(diff.minParticipants).toBe(5);
		});

		test('detects maxParticipants change', () => {
			const form = { ...BASE_FORM, maxParticipants: 500 };
			const diff = computeRaffleDiff({
				original: BASE_RAFFLE,
				current: form,
				categoryId: 'cat-1',
				checkInQuestionId: 'q-1',
			});
			expect(diff.maxParticipants).toBe(500);
		});
	});

	describe('category and question', () => {
		test('detects category change', () => {
			const diff = computeRaffleDiff({
				original: BASE_RAFFLE,
				current: BASE_FORM,
				categoryId: 'cat-2',
				checkInQuestionId: 'q-1',
			});
			expect(diff.categoryId).toBe('cat-2');
		});

		test('detects question change', () => {
			const diff = computeRaffleDiff({
				original: BASE_RAFFLE,
				current: BASE_FORM,
				categoryId: 'cat-1',
				checkInQuestionId: 'q-2',
			});
			expect(diff.questionId).toBe('q-2');
		});

		test('handles null questionId in original', () => {
			const raffle = { ...BASE_RAFFLE, questionId: null };
			const diff = computeRaffleDiff({
				original: raffle,
				current: BASE_FORM,
				categoryId: 'cat-1',
				checkInQuestionId: 'q-1',
			});
			// Original questionId is null, normalized to '' — 'q-1' differs from ''
			expect(diff.questionId).toBe('q-1');
		});

		test('no question diff when both empty', () => {
			const raffle = { ...BASE_RAFFLE, questionId: null };
			const diff = computeRaffleDiff({
				original: raffle,
				current: BASE_FORM,
				categoryId: 'cat-1',
				checkInQuestionId: '',
			});
			expect(diff.questionId).toBeUndefined();
		});
	});

	describe('date/time fields', () => {
		test('detects start date change', () => {
			const form = {
				...BASE_FORM,
				startDate: '2026-07-01',
				startTime: '10:00',
			};
			const diff = computeRaffleDiff({
				original: BASE_RAFFLE,
				current: form,
				categoryId: 'cat-1',
				checkInQuestionId: 'q-1',
			});
			expect(diff.startAt).toBeDefined();
			expect(diff.startAt).toContain('2026-07-01');
		});

		test('detects end time change', () => {
			const form = { ...BASE_FORM, endTime: '18:00' };
			const diff = computeRaffleDiff({
				original: BASE_RAFFLE,
				current: form,
				categoryId: 'cat-1',
				checkInQuestionId: 'q-1',
			});
			expect(diff.endAt).toBeDefined();
		});
	});

	describe('crypto fields', () => {
		test('detects acceptsCrypto toggle on', () => {
			const form = { ...BASE_FORM, acceptsCrypto: true };
			const diff = computeRaffleDiff({
				original: BASE_RAFFLE,
				current: form,
				categoryId: 'cat-1',
				checkInQuestionId: 'q-1',
			});
			expect(diff.acceptsCrypto).toBe(true);
		});

		test('detects chain IDs change', () => {
			const form = {
				...BASE_FORM,
				acceptsCrypto: true,
				cryptoChainIds: [137],
			};
			const diff = computeRaffleDiff({
				original: BASE_RAFFLE,
				current: form,
				categoryId: 'cat-1',
				checkInQuestionId: 'q-1',
			});
			expect(diff.cryptoChainIds).toEqual([137]);
		});

		test('detects token IDs change', () => {
			const form = {
				...BASE_FORM,
				acceptsCrypto: true,
				cryptoTokens: ['usdc'],
			};
			const diff = computeRaffleDiff({
				original: BASE_RAFFLE,
				current: form,
				categoryId: 'cat-1',
				checkInQuestionId: 'q-1',
			});
			expect(diff.cryptoTokens).toEqual(['usdc']);
		});

		test('detects token pricing change', () => {
			const form = {
				...BASE_FORM,
				acceptsCrypto: true,
				cryptoTokenPricing: [{ tokenId: 'earnm', price: '100' }],
			};
			const diff = computeRaffleDiff({
				original: BASE_RAFFLE,
				current: form,
				categoryId: 'cat-1',
				checkInQuestionId: 'q-1',
			});
			expect(diff.cryptoTokenPricing).toEqual([
				{ tokenId: 'earnm', price: '100' },
			]);
		});

		test('ignores array order for chain IDs comparison', () => {
			// Raffle with crypto enabled and chains [137, 42161]
			const raffle: Raffle = {
				...BASE_RAFFLE,
				cryptoOptions: {
					chains: [
						{ chainId: 137, name: 'Polygon', tokens: [] },
						{ chainId: 42_161, name: 'Arbitrum', tokens: [] },
					],
				},
			};
			// Form has same chains but reversed order — should not diff
			const form = {
				...BASE_FORM,
				acceptsCrypto: true,
				cryptoChainIds: [42_161, 137],
			};
			const diff = computeRaffleDiff({
				original: raffle,
				current: form,
				categoryId: 'cat-1',
				checkInQuestionId: 'q-1',
			});
			expect(diff.cryptoChainIds).toBeUndefined();
		});
	});

	describe('multiple changes', () => {
		test('includes all changed fields', () => {
			const form = {
				...BASE_FORM,
				title: 'New Title',
				price: 999,
				numberOfWinners: 5,
			};
			const diff = computeRaffleDiff({
				original: BASE_RAFFLE,
				current: form,
				categoryId: 'cat-1',
				checkInQuestionId: 'q-1',
			});
			expect(diff.title).toBe('New Title');
			expect(diff.declaredValueAmount).toBe('999');
			expect(diff.numberOfWinners).toBe(5);
			// Unchanged fields absent
			expect(diff.description).toBeUndefined();
		});
	});
});

describe('hasRaffleChanges', () => {
	test('returns false when no changes', () => {
		expect(
			hasRaffleChanges({
				original: BASE_RAFFLE,
				current: BASE_FORM,
				categoryId: 'cat-1',
				checkInQuestionId: 'q-1',
			}),
		).toBe(false);
	});

	test('returns true when title changed', () => {
		const form = { ...BASE_FORM, title: 'Changed' };
		expect(
			hasRaffleChanges({
				original: BASE_RAFFLE,
				current: form,
				categoryId: 'cat-1',
				checkInQuestionId: 'q-1',
			}),
		).toBe(true);
	});

	test('returns true when only category changed', () => {
		expect(
			hasRaffleChanges({
				original: BASE_RAFFLE,
				current: BASE_FORM,
				categoryId: 'cat-99',
				checkInQuestionId: 'q-1',
			}),
		).toBe(true);
	});
});
