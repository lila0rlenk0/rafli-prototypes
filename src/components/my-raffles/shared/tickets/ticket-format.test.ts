import { describe, expect, test } from 'bun:test';

import {
	formatParticipantLabel,
	shouldShowPartialDrawCallout,
} from './ticket-format';

describe('formatParticipantLabel', () => {
	test('returns singular form for count 1', () => {
		expect(formatParticipantLabel(1)).toBe('participant');
	});

	test('returns plural form for count 0', () => {
		expect(formatParticipantLabel(0)).toBe('participants');
	});

	test('returns plural form for count greater than 1', () => {
		expect(formatParticipantLabel(2)).toBe('participants');
		expect(formatParticipantLabel(25)).toBe('participants');
	});
});

describe('shouldShowPartialDrawCallout', () => {
	test('returns false when minParticipants is 0 (disabled)', () => {
		expect(shouldShowPartialDrawCallout(0, 5)).toBe(false);
	});

	test('returns false when min equals winners (no gap)', () => {
		// min=5, winners=5 — min-1 (4) is less than winners, no partial range.
		expect(shouldShowPartialDrawCallout(5, 5)).toBe(false);
	});

	test('returns false when min is below winners (auto-cancel range only)', () => {
		expect(shouldShowPartialDrawCallout(3, 5)).toBe(false);
	});

	test('returns false when min is exactly winners + 1 (single-count overlap)', () => {
		// min=6, winners=5 — partial range would be [5, 5], no-op.
		expect(shouldShowPartialDrawCallout(6, 5)).toBe(false);
	});

	test('returns true when min exceeds winners by at least 2', () => {
		expect(shouldShowPartialDrawCallout(7, 5)).toBe(true);
	});

	test('returns false for negative minParticipants', () => {
		// Defensive — guard treats non-positive as disabled.
		expect(shouldShowPartialDrawCallout(-1, 5)).toBe(false);
	});
});
