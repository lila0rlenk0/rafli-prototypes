import { describe, expect, test } from 'bun:test';

import { firstSearchParam, parsePendingCreditEmail } from './page';

describe('firstSearchParam', () => {
	test('returns null when the value is undefined', () => {
		expect(firstSearchParam(undefined)).toBeNull();
	});

	test('returns the value verbatim when it is a plain string', () => {
		expect(firstSearchParam('jose@example.com')).toBe('jose@example.com');
	});

	test('collapses an array to the first element', () => {
		// Repeated `?email=a&email=b` is non-sensical here — Fanbasis only
		// emits a single value — but Next's typing allows it, so we must
		// not throw. Picking the first entry is the safest behaviour: it
		// matches what a single-value handler would see if the second copy
		// had never been sent.
		expect(firstSearchParam(['a@b.co', 'c@d.co'])).toBe('a@b.co');
	});

	test('returns null when the array is empty', () => {
		// Defensive — Next.js never emits an empty array for a present key,
		// but the type allows it, so the parser must not return `undefined`.
		expect(firstSearchParam([])).toBeNull();
	});
});

describe('parsePendingCreditEmail', () => {
	test('accepts a plausibly-shaped email and returns it trimmed', () => {
		// Leading/trailing whitespace can sneak in via copy-paste flows on
		// the Fanbasis hosted page. Trimming here keeps the displayed copy
		// clean without depending on Fanbasis to normalise.
		expect(parsePendingCreditEmail('  jose@example.com  ')).toBe(
			'jose@example.com',
		);
	});

	test('preserves "+" subaddressing', () => {
		// The Fanbasis return URL we observed in staging used a `+` alias.
		// `searchParams` already URL-decodes, so we receive a literal `+`,
		// not `%2B`. Regression-guarding because a naive shape check that
		// rejected `+` would break a real buyer cohort.
		expect(parsePendingCreditEmail('jose.chifflet+1@modemobile.com')).toBe(
			'jose.chifflet+1@modemobile.com',
		);
	});

	test('rejects values missing an @ — falls back to generic copy', () => {
		expect(parsePendingCreditEmail('not-an-email')).toBeNull();
	});

	test('rejects values missing a TLD', () => {
		// `user@host` is technically a valid SMTP mailbox on a local network,
		// but for the public-credit funnel we only ever issue links to
		// public-DNS addresses. Showing such a value would look broken;
		// generic copy is better.
		expect(parsePendingCreditEmail('jose@example')).toBeNull();
	});

	test('rejects oversize values beyond the RFC 5321 cap', () => {
		// 250 local + `@a.co` = 256 > 254. The backend DTO already rejects
		// these at create-checkout time, so we should never see one in the
		// wild — this guards the page against a hand-crafted URL that
		// could blow out the card layout.
		const oversize = `${'a'.repeat(250)}@a.co`;
		expect(parsePendingCreditEmail(oversize)).toBeNull();
	});

	test('returns null when the param is missing', () => {
		// Happy-path safety net: if Fanbasis ever stops echoing `email` on
		// the success redirect, the page degrades to generic copy instead
		// of crashing or showing `undefined`.
		expect(parsePendingCreditEmail(undefined)).toBeNull();
	});

	test('returns null for an empty string', () => {
		expect(parsePendingCreditEmail('')).toBeNull();
	});
});
