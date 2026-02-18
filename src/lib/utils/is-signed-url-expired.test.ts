import { describe, expect, test } from 'bun:test';

import { isSignedUrlExpired } from './is-signed-url-expired';

describe('isSignedUrlExpired', () => {
	test('returns false for null/undefined/empty', () => {
		expect(isSignedUrlExpired(null, 1000)).toBe(false);
		expect(isSignedUrlExpired(undefined, 1000)).toBe(false);
		expect(isSignedUrlExpired('', 1000)).toBe(false);
	});

	test('returns false for invalid date strings', () => {
		expect(isSignedUrlExpired('not-a-date', 1000)).toBe(false);
	});

	test('returns false when expiry is in the future', () => {
		expect(isSignedUrlExpired('2026-01-01T00:00:00.000Z', Date.parse('2025-12-31T23:00:00.000Z'))).toBe(false);
	});

	test('returns true when expiry is in the past', () => {
		expect(isSignedUrlExpired('2026-01-01T00:00:00.000Z', Date.parse('2026-01-01T00:00:01.000Z'))).toBe(true);
	});

	test('returns true when expiry equals now', () => {
		const now = Date.parse('2026-01-01T00:00:00.000Z');
		expect(isSignedUrlExpired('2026-01-01T00:00:00.000Z', now)).toBe(true);
	});
});
