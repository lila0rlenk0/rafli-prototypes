import { describe, expect, test } from 'bun:test';

import { extractWagmiCookie } from './extract-wagmi-cookie';

// Representative serialized wagmi state. The `=` characters inside the value
// exercise the "startsWith, don't split on =" invariant — a naive
// `value.split('=')[1]` parser would truncate the state at the first `=`.
const WAGMI_VALUE = 'v=2==padding==';
const WAGMI_ENTRY = `wagmi.store=${WAGMI_VALUE}`;

// Real-shape auth cookie — present on every authenticated request and the
// exact value we must NOT forward across the Server→Client boundary.
const RAFFLY_TOKEN_ENTRY =
	'raffly-token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature';
const RAFFLY_SESSION_ENTRY = 'raffly-session=%7B%22id%22%3A%22abc%22%7D';
const RAFFLY_MODE_ENTRY = 'raffly-user-mode=participant';

describe('extractWagmiCookie', () => {
	describe('absent or empty input', () => {
		test('returns null for null', () => {
			expect(extractWagmiCookie(null)).toBeNull();
		});

		test('returns null for undefined', () => {
			expect(extractWagmiCookie(undefined)).toBeNull();
		});

		test('returns null for empty string', () => {
			expect(extractWagmiCookie('')).toBeNull();
		});

		test('returns null when wagmi.store is not present', () => {
			const header = [
				RAFFLY_TOKEN_ENTRY,
				RAFFLY_SESSION_ENTRY,
				RAFFLY_MODE_ENTRY,
			].join('; ');
			expect(extractWagmiCookie(header)).toBeNull();
		});
	});

	describe('wagmi.store present', () => {
		test('returns only the wagmi entry alongside session cookies', () => {
			const header = [
				RAFFLY_TOKEN_ENTRY,
				WAGMI_ENTRY,
				RAFFLY_SESSION_ENTRY,
			].join('; ');
			expect(extractWagmiCookie(header)).toBe(WAGMI_ENTRY);
		});

		test('returns wagmi entry when it is the only cookie', () => {
			expect(extractWagmiCookie(WAGMI_ENTRY)).toBe(WAGMI_ENTRY);
		});

		test('preserves `=` characters inside the value', () => {
			// Regression guard: naive `value.split('=')[1]` would drop
			// everything after the first `=` in the value.
			const result = extractWagmiCookie(WAGMI_ENTRY);
			expect(result).toBe(WAGMI_ENTRY);
			expect(result).toContain('==padding==');
		});

		test('tolerates `;` separator without trailing space', () => {
			const header = `${RAFFLY_TOKEN_ENTRY};${WAGMI_ENTRY};${RAFFLY_SESSION_ENTRY}`;
			expect(extractWagmiCookie(header)).toBe(WAGMI_ENTRY);
		});
	});

	describe('security boundary', () => {
		test('never returns session JWT when wagmi.store absent', () => {
			const header = [RAFFLY_TOKEN_ENTRY, RAFFLY_SESSION_ENTRY].join('; ');
			const result = extractWagmiCookie(header);
			expect(result).toBeNull();
			// Belt-and-suspenders: even as a substring the JWT must not leak.
			expect(result ?? '').not.toContain('raffly-token');
		});

		test('never includes other cookies in its output', () => {
			const header = [
				RAFFLY_TOKEN_ENTRY,
				WAGMI_ENTRY,
				RAFFLY_SESSION_ENTRY,
				RAFFLY_MODE_ENTRY,
			].join('; ');
			const result = extractWagmiCookie(header);
			expect(result).toBe(WAGMI_ENTRY);
			expect(result).not.toContain('raffly-token');
			expect(result).not.toContain('raffly-session');
			expect(result).not.toContain('raffly-user-mode');
		});

		test('does not match keys that merely contain `wagmi.store`', () => {
			// Prefix-attack guard: an attacker-controlled cookie name like
			// `not-wagmi.store` or `wagmi.storehack` must not be returned.
			const header = [
				'not-wagmi.store=attacker',
				'wagmi.storehack=attacker',
				RAFFLY_TOKEN_ENTRY,
			].join('; ');
			expect(extractWagmiCookie(header)).toBeNull();
		});
	});

	describe('percent-encoded values', () => {
		// Regression: Safari (and some other browsers) percent-encode reserved
		// cookie chars like `{`, `"`, and `,` when `cookieStorage.setItem`
		// writes raw JSON into `document.cookie`. The request `Cookie` header
		// then echoes the encoded form, and wagmi's `cookieToInitialState`
		// passes the substring straight to `JSON.parse` — so without decoding
		// here, SSR hydration crashes with `Unexpected token '%'`.
		test('decodes percent-encoded wagmi state before returning', () => {
			const decodedValue = '{"state":{"connections":[]},"version":2}';
			const encodedValue = encodeURIComponent(decodedValue);
			const header = `wagmi.store=${encodedValue}`;
			expect(extractWagmiCookie(header)).toBe(`wagmi.store=${decodedValue}`);
		});

		test('returns raw value when percent-encoding is malformed', () => {
			// Stray `%` without two trailing hex digits would make
			// `decodeURIComponent` throw. The extractor must not crash SSR —
			// returning the raw value lets wagmi surface its own parse error
			// (or fall back to undefined initial state) downstream.
			const header = 'wagmi.store=%ZZinvalid';
			expect(extractWagmiCookie(header)).toBe('wagmi.store=%ZZinvalid');
		});

		test('leaves already-decoded values unchanged', () => {
			// Chromium writes the raw value into `document.cookie` without
			// encoding. `decodeURIComponent` is a no-op on strings without
			// `%` escapes, so existing sessions continue to hydrate.
			expect(extractWagmiCookie(WAGMI_ENTRY)).toBe(WAGMI_ENTRY);
		});
	});
});
