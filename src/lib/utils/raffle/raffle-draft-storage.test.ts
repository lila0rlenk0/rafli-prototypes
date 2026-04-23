import { beforeEach, describe, expect, mock, test } from 'bun:test';

import {
	ABANDONED_DRAFT_KEY,
	DRAFT_STORAGE_KEY,
	clearRaffleDraft,
	discardAbandonedDraft,
	hasAbandonedDraft,
	loadRaffleDraft,
	subscribeToRaffleDraft,
} from './raffle-draft-storage';

// Minimal DOM polyfill — Bun doesn't ship `window`/`localStorage` globals
// in test mode, and `loadRaffleDraft` short-circuits on
// `typeof window === 'undefined'`. Other suite files may have already
// installed readonly descriptors, so `Object.defineProperty({ configurable
// }) ` lets this block both install-once-when-missing and be overwritten
// by later files without tripping "readonly property" TypeErrors.
// `loadRaffleDraft` only reads `localStorage` at call time, so running
// this after module imports is safe.
if (typeof (globalThis as { window?: unknown }).window === 'undefined') {
	Object.defineProperty(globalThis, 'window', {
		configurable: true,
		writable: true,
		value: globalThis,
	});
}
if (
	typeof (globalThis as { localStorage?: unknown }).localStorage === 'undefined'
) {
	const map = new Map<string, string>();
	Object.defineProperty(globalThis, 'localStorage', {
		configurable: true,
		writable: true,
		value: {
			getItem: (k: string) => map.get(k) ?? null,
			setItem: (k: string, v: string) => {
				map.set(k, v);
			},
			removeItem: (k: string) => {
				map.delete(k);
			},
			clear: () => {
				map.clear();
			},
		},
	});
}

/**
 * Minimum valid-shaped raffle draft the current zod schema accepts.
 * Kept in sync with `raffleDraftSchema` via the test running against the
 * real schema — if the schema evolves incompatibly, these tests surface
 * the exact failure mode (parse → preserved at backup slot).
 */
const VALID_DRAFT = {
	title: 't',
	description: 'd',
	category: 'c',
	price: 10,
	startDate: '2030-01-01',
	startTime: '00:00',
	endDate: '2030-02-01',
	endTime: '00:00',
	pricePerTicket: 1,
	numberOfWinners: 1,
	minParticipants: 0,
	maxParticipants: 0,
	checkInQuestion: '',
	acceptsCrypto: false,
	cryptoChainIds: [] as number[],
	cryptoTokens: [] as string[],
	cryptoTokenPricing: [] as unknown[],
	currentStep: 0,
	savedAt: new Date().toISOString(),
};

// Bun provides a native in-memory `localStorage` in test mode, so we use
// it directly instead of shimming `globalThis`. Attempting to assign
// `globalThis.localStorage = …` trips Bun's readonly property descriptor
// the moment another test file in the run has already touched it.
beforeEach(() => {
	localStorage.clear();
	// The storage module memoizes the last raw read — force a fresh parse
	// by nudging the active key through a clear cycle before each test.
	loadRaffleDraft();
});

describe('loadRaffleDraft — abandoned-slot preservation', () => {
	test('valid draft loads without touching the backup slot', () => {
		localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(VALID_DRAFT));

		const loaded = loadRaffleDraft();

		expect(loaded).not.toBeNull();
		expect(localStorage.getItem(ABANDONED_DRAFT_KEY)).toBeNull();
	});

	test('schema-validation failure preserves raw blob at backup slot', () => {
		// Simulates schema drift: body parses as JSON but fails the zod schema.
		const drifted = JSON.stringify({ unknownField: true });
		localStorage.setItem(DRAFT_STORAGE_KEY, drifted);

		const loaded = loadRaffleDraft();

		expect(loaded).toBeNull();
		expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
		expect(localStorage.getItem(ABANDONED_DRAFT_KEY)).toBe(drifted);
		expect(hasAbandonedDraft()).toBe(true);
	});

	test('JSON parse failure preserves raw blob at backup slot', () => {
		// Half-written draft / quota-truncated write / tampered storage.
		const corrupt = '{"title": "unfinished';
		localStorage.setItem(DRAFT_STORAGE_KEY, corrupt);

		const loaded = loadRaffleDraft();

		expect(loaded).toBeNull();
		expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
		expect(localStorage.getItem(ABANDONED_DRAFT_KEY)).toBe(corrupt);
	});

	test('expired valid draft is discarded without creating a backup', () => {
		// Genuine expiration — no value in recovery; must NOT surface a
		// backup or fire the "we couldn't restore" toast on the next mount.
		const expired = {
			...VALID_DRAFT,
			savedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
		};
		localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(expired));

		const loaded = loadRaffleDraft();

		expect(loaded).toBeNull();
		expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
		expect(localStorage.getItem(ABANDONED_DRAFT_KEY)).toBeNull();
	});

	test('discardAbandonedDraft clears the backup slot', () => {
		localStorage.setItem(ABANDONED_DRAFT_KEY, '{"garbage": true}');

		discardAbandonedDraft();

		expect(localStorage.getItem(ABANDONED_DRAFT_KEY)).toBeNull();
		expect(hasAbandonedDraft()).toBe(false);
	});

	test('clearRaffleDraft does not accidentally drop the backup slot', () => {
		// clearDraft is user-triggered "start fresh" — it should only remove
		// the active draft, leaving any preserved backup alone until the
		// toast consumer explicitly dismisses it.
		localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(VALID_DRAFT));
		localStorage.setItem(ABANDONED_DRAFT_KEY, '{"preserved": true}');

		clearRaffleDraft();

		expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
		expect(localStorage.getItem(ABANDONED_DRAFT_KEY)).toBe(
			'{"preserved": true}',
		);
	});
});

describe('subscribeToRaffleDraft — storage events', () => {
	/** `useSyncExternalStore` on other tabs must re-run when the backup slot changes. */
	test('notifies when abandoned-draft key changes (cross-tab)', () => {
		const onChange = mock(() => {});
		const unsubscribe = subscribeToRaffleDraft(onChange);
		// Bun has no `StorageEvent` global; the listener only reads `key` and
		// `storageArea` (same contract as the DOM `storage` event).
		const ev = new Event('storage') as Event & {
			key: string | null;
			newValue: string | null;
			oldValue: string | null;
			url: string;
			storageArea: Storage;
		};
		Object.assign(ev, {
			key: ABANDONED_DRAFT_KEY,
			newValue: null,
			oldValue: '{}',
			url: 'http://localhost/',
			storageArea: localStorage,
		});

		window.dispatchEvent(ev);

		expect(onChange).toHaveBeenCalledTimes(1);
		unsubscribe();
	});
});
