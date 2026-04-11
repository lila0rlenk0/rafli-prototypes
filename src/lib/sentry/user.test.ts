import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import { getClientUserId } from './user';

/**
 * Unit tests for `getClientUserId` — reads `raffly-session` from
 * `document.cookie` on the browser and returns the authenticated user's ID.
 *
 * These tests only exercise the pure cookie-parsing branch, not the Sentry
 * `setUser` write path (that's wired through `@sentry/nextjs` and covered
 * by the integration-level tests on `captureServiceError`).
 *
 * `beforeEach`/`afterEach` install a minimal `document` stub on
 * `globalThis`, which simulates a browser environment for this one
 * function. The stub is cleaned up after each test so it never leaks
 * into other files in the same Bun worker.
 */

// Reference to the original `document` so tests can restore SSR-like state.
// In a Bun unit-test context `document` is undefined; we still capture
// whatever is present to be maximally defensive.
const ORIGINAL_DOCUMENT = (globalThis as { document?: unknown }).document;

function setCookieString(cookie: string): void {
	(globalThis as { document?: { cookie: string } }).document = { cookie };
}

function clearDocument(): void {
	(globalThis as { document?: unknown }).document = undefined;
}

describe('getClientUserId', () => {
	afterEach(() => {
		// Restore whatever was there before this test ran. If the suite
		// runs inside a browser-like environment, we must not leave our
		// stub behind.
		if (ORIGINAL_DOCUMENT === undefined) {
			clearDocument();
		} else {
			(globalThis as { document?: unknown }).document = ORIGINAL_DOCUMENT;
		}
	});

	describe('SSR / non-browser environments', () => {
		test('returns null when document is undefined', () => {
			clearDocument();
			expect(getClientUserId()).toBeNull();
		});
	});

	describe('cookie present and valid', () => {
		beforeEach(() => {
			// Realistic encoded cookie mirroring what setAuthCookies writes:
			// `JSON.stringify({ id, name, ... })` then URL-encoded by the browser.
			const userJson = JSON.stringify({
				id: 'user-123',
				name: 'Test User',
				avatar: null,
			});
			setCookieString(`raffly-session=${encodeURIComponent(userJson)}`);
		});

		test('returns the user ID from the session cookie', () => {
			expect(getClientUserId()).toBe('user-123');
		});
	});

	describe('cookie alongside other cookies', () => {
		test('finds raffly-session in the middle of the cookie string', () => {
			// The helper splits on "; " — verify we tolerate that separator and
			// don't accidentally match a cookie that contains the substring.
			const userJson = JSON.stringify({ id: 'user-abc' });
			setCookieString(
				`_ga=GA1.2.xyz; raffly-session=${encodeURIComponent(userJson)}; intercom-id=foo`,
			);
			expect(getClientUserId()).toBe('user-abc');
		});
	});

	describe('cookie missing or malformed', () => {
		test('returns null when the session cookie is absent', () => {
			setCookieString('_ga=GA1.2.xyz; intercom-id=foo');
			expect(getClientUserId()).toBeNull();
		});

		test('returns null when the cookie is empty', () => {
			setCookieString('');
			expect(getClientUserId()).toBeNull();
		});

		test('returns null when the cookie value is not valid JSON', () => {
			setCookieString('raffly-session=not-a-json-object');
			expect(getClientUserId()).toBeNull();
		});

		test('returns null when the parsed object has no id field', () => {
			setCookieString(
				`raffly-session=${encodeURIComponent(JSON.stringify({ name: 'no-id' }))}`,
			);
			expect(getClientUserId()).toBeNull();
		});

		test('returns null when id is non-string (guards against type drift)', () => {
			setCookieString(
				`raffly-session=${encodeURIComponent(JSON.stringify({ id: 42 }))}`,
			);
			expect(getClientUserId()).toBeNull();
		});

		test('returns null for null cookie payload', () => {
			setCookieString(
				`raffly-session=${encodeURIComponent(JSON.stringify(null))}`,
			);
			expect(getClientUserId()).toBeNull();
		});
	});

	describe('lookalike cookie names do not false-match', () => {
		test('ignores a cookie whose name ends with raffly-session', () => {
			// The function uses `startsWith("raffly-session=")`, so a cookie
			// named `custom-raffly-session` must not match. Use a realistic
			// leading space to mirror browser serialization.
			setCookieString(
				`custom-raffly-session=${encodeURIComponent(JSON.stringify({ id: 'wrong' }))}; other=1`,
			);
			expect(getClientUserId()).toBeNull();
		});
	});
});
