import { describe, expect, test } from 'bun:test';
import { validateReturnTo } from './validate-return-to';

describe('validateReturnTo', () => {
	describe('valid paths', () => {
		test('accepts simple relative paths', () => {
			expect(validateReturnTo('/browse')).toBe('/browse');
			expect(validateReturnTo('/profile')).toBe('/profile');
			expect(validateReturnTo('/my-raffles')).toBe('/my-raffles');
		});

		test('accepts nested paths', () => {
			expect(validateReturnTo('/browse/raffle-123')).toBe('/browse/raffle-123');
			expect(validateReturnTo('/host/username/raffles')).toBe(
				'/host/username/raffles',
			);
		});

		test('accepts paths with query strings', () => {
			expect(validateReturnTo('/browse?page=2')).toBe('/browse?page=2');
			expect(validateReturnTo('/search?q=test&sort=asc')).toBe(
				'/search?q=test&sort=asc',
			);
		});

		test('accepts paths with hash fragments', () => {
			expect(validateReturnTo('/browse#section')).toBe('/browse#section');
		});
	});

	describe('null/empty input', () => {
		test('returns default for null', () => {
			expect(validateReturnTo(null)).toBe('/browse');
		});

		test('returns default for empty string', () => {
			expect(validateReturnTo('')).toBe('/browse');
		});

		test('uses custom default path', () => {
			expect(validateReturnTo(null, '/home')).toBe('/home');
			expect(validateReturnTo('', '/dashboard')).toBe('/dashboard');
		});
	});

	describe('open redirect prevention', () => {
		test('rejects absolute URLs', () => {
			expect(validateReturnTo('https://evil.com')).toBe('/browse');
			expect(validateReturnTo('http://evil.com')).toBe('/browse');
		});

		test('rejects protocol-relative URLs', () => {
			expect(validateReturnTo('//evil.com')).toBe('/browse');
			expect(validateReturnTo('//evil.com/path')).toBe('/browse');
		});

		test('rejects URLs without leading slash', () => {
			expect(validateReturnTo('browse')).toBe('/browse');
			expect(validateReturnTo('evil.com')).toBe('/browse');
		});

		test('rejects javascript: protocol', () => {
			expect(validateReturnTo('javascript:alert(1)')).toBe('/browse');
			expect(validateReturnTo('JAVASCRIPT:alert(1)')).toBe('/browse');
		});

		test('rejects data: protocol', () => {
			expect(validateReturnTo('data:text/html,<script>alert(1)</script>')).toBe(
				'/browse',
			);
		});

		test('rejects encoded attacks', () => {
			expect(validateReturnTo('/%2F/evil.com')).toBe('/browse');
			expect(validateReturnTo('/path%3A//evil.com')).toBe('/browse');
		});

		test('rejects invalid URL encoding', () => {
			expect(validateReturnTo('/%ZZ')).toBe('/browse');
		});

		test('rejects backslash (some parsers coerce \\/ to //)', () => {
			// Defense-in-depth: modern browsers treat "/\/evil.com" as a
			// single-segment path, but older/proxy URL parsers have coerced
			// this into protocol-relative redirects before. Reject outright.
			expect(validateReturnTo('/\\/evil.com')).toBe('/browse');
			expect(validateReturnTo('/path\\segment')).toBe('/browse');
		});
	});

	describe('edge cases', () => {
		test('handles root path', () => {
			expect(validateReturnTo('/')).toBe('/');
		});

		test('handles paths with special characters', () => {
			expect(validateReturnTo('/raffle/test-raffle')).toBe(
				'/raffle/test-raffle',
			);
			expect(validateReturnTo('/user/@handle')).toBe('/user/@handle');
		});

		test('preserves unicode in paths', () => {
			expect(validateReturnTo('/café')).toBe('/café');
		});
	});
});
