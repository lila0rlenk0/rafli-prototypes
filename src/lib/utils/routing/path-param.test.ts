import { describe, expect, test } from 'bun:test';

import { pathParam } from './path-param';

/**
 * `pathParam` is the ONLY sanctioned way user-controlled identifiers are
 * interpolated into backend URLs (see eslint rule
 * `no-unencoded-path-interpolation`). A regression here turns every
 * `/raffles/${id}` call site into a path-traversal vector — a malicious
 * caller could retarget a PATCH `/raffles/:id` to `DELETE /admin/users/:x`
 * on any backend that doesn't normalize RFC 3986 dot-segments.
 */
describe('pathParam', () => {
	test('percent-encodes path separators so injected segments collapse into one', () => {
		// `..%2F` keeps the "../" string but strips the slash the router
		// splits on — every attacker traversal attempt becomes a single,
		// literal segment the backend treats as a missing resource.
		expect(pathParam('../../admin/users/target')).toBe(
			'..%2F..%2Fadmin%2Fusers%2Ftarget',
		);
		expect(pathParam('/raffles')).toBe('%2Fraffles');
	});

	test('percent-encodes query-string delimiters to block parameter injection', () => {
		// `?` and `#` terminate the path in an HTTP URL. If left raw, a
		// caller could smuggle query params into an endpoint that normally
		// exposes none — for example turning `/raffles/:id` into
		// `/raffles/abc?role=admin`.
		expect(pathParam('abc?role=admin')).toBe('abc%3Frole%3Dadmin');
		expect(pathParam('abc#fragment')).toBe('abc%23fragment');
		expect(pathParam('a&b=c')).toBe('a%26b%3Dc');
	});

	test('encodes whitespace and control characters so logs/routers see one token', () => {
		// Raw spaces, tabs, or CRLF let an attacker split log lines or
		// craft ambiguous path segments. Percent-encoding forces one
		// contiguous token downstream.
		expect(pathParam('foo bar')).toBe('foo%20bar');
		expect(pathParam('foo\tbar')).toBe('foo%09bar');
		expect(pathParam('foo\r\nbar')).toBe('foo%0D%0Abar');
	});

	test('passes RFC 3986 unreserved characters through unchanged', () => {
		// Unreserved per §2.3 — these are always safe in a path segment
		// so the helper must NOT over-encode and break legitimate URLs.
		expect(pathParam('abc-ABC_123.~')).toBe('abc-ABC_123.~');
	});

	test('encodes unicode so mbcs/bidi payloads never reach the backend raw', () => {
		// Some backends normalize Unicode aggressively (NFKC) or treat
		// certain RTL codepoints as path separators. Encoding locks the
		// over-the-wire representation to ASCII.
		expect(pathParam('cafè')).toBe('caf%C3%A8');
		expect(pathParam('🔥')).toBe('%F0%9F%94%A5');
	});

	test('handles empty string without throwing', () => {
		// Defensive: callers may not always validate upfront. Empty
		// string is harmless — the resulting URL will 404 at the backend.
		expect(pathParam('')).toBe('');
	});
});
