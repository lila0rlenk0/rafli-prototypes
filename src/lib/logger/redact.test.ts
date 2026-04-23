import { describe, expect, test } from 'bun:test';

import { redact } from './redact';

/**
 * Pure unit tests for the redaction pass that runs before every log
 * line is serialized. The goal is a tight contract: the scrubber
 * removes known-sensitive shapes while preserving the rest of the
 * payload byte-for-byte so analytics queries don't lose resolution.
 */

describe('redact', () => {
	describe('key-based redaction', () => {
		test('replaces top-level sensitive keys with [REDACTED]', () => {
			const out = redact({ password: 'hunter2', userId: 'u-1' });
			expect(out).toEqual({ password: '[REDACTED]', userId: 'u-1' });
		});

		test('is case-insensitive on key names', () => {
			const out = redact({ Authorization: 'Bearer xxx', 'Set-Cookie': 'abc' });
			expect(out).toEqual({
				Authorization: '[REDACTED]',
				'Set-Cookie': '[REDACTED]',
			});
		});

		test('recurses into nested objects', () => {
			const out = redact({
				user: { id: 'u-1', password: 'secret', profile: { apiKey: 'k' } },
			});
			expect(out).toEqual({
				user: {
					id: 'u-1',
					password: '[REDACTED]',
					profile: { apiKey: '[REDACTED]' },
				},
			});
		});

		test('recurses into arrays of objects', () => {
			const out = redact({
				items: [{ token: 'a' }, { token: 'b', name: 'ok' }],
			});
			expect(out).toEqual({
				items: [{ token: '[REDACTED]' }, { token: '[REDACTED]', name: 'ok' }],
			});
		});
	});

	describe('string pattern redaction', () => {
		test('scrubs email addresses in freeform strings', () => {
			const out = redact({ msg: 'user alice@example.com signed in' });
			expect(out).toEqual({ msg: 'user [REDACTED] signed in' });
		});

		test('scrubs JWTs in freeform strings', () => {
			// Valid-shaped JWT (header.payload.signature) — all base64url.
			const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxw';
			const out = redact({ msg: `Authorization: Bearer ${jwt}` });
			expect(out).toEqual({ msg: 'Authorization: Bearer [REDACTED]' });
		});

		test('short-circuits on strings with no sensitive markers', () => {
			// Load-bearing performance test — redaction runs on every log
			// line, we cannot afford a regex state machine for plain strings.
			const out = redact({ msg: 'order created', count: 3 });
			expect(out).toEqual({ msg: 'order created', count: 3 });
		});
	});

	describe('Error values', () => {
		test('serializes Error into a plain object with scrubbed message', () => {
			const err = new Error('failed for user alice@example.com');
			const out = redact({ error: err });
			const errorOut = (out as { error: { message: string; name: string } })
				.error;
			expect(errorOut.name).toBe('Error');
			expect(errorOut.message).toBe('failed for user [REDACTED]');
		});
	});

	describe('built-in non-plain objects', () => {
		test('preserves Date as ISO string — does not mangle to {}', () => {
			// `typeof new Date() === 'object'` and `Object.keys(new Date())`
			// returns `[]`, so a naïve object walk would turn every Date in
			// a log payload into `{}` and silently lose the field. A Date
			// *must* round-trip to its ISO form.
			const d = new Date('2026-04-23T12:34:56.000Z');
			const out = redact({ createdAt: d });
			expect(out.createdAt).toBe('2026-04-23T12:34:56.000Z');
		});

		test('preserves Date nested inside arrays and objects', () => {
			const d = new Date('2026-04-23T00:00:00.000Z');
			const out = redact({ list: [{ when: d }] });
			expect(out).toEqual({
				list: [{ when: '2026-04-23T00:00:00.000Z' }],
			});
		});
	});

	describe('safety rails', () => {
		test('breaks circular references with [CIRCULAR]', () => {
			// Cycle guard — logger must never throw on a cyclic payload.
			const a: Record<string, unknown> = { id: 1 };
			a.self = a;
			const out = redact({ a });
			const aOut = (out as { a: { self: unknown } }).a;
			expect(aOut.self).toBe('[CIRCULAR]');
		});

		test('preserves null and undefined', () => {
			const out = redact({ a: null, b: undefined, c: 0 });
			expect(out).toEqual({ a: null, b: undefined, c: 0 });
		});

		test('drops functions and symbols (not meaningful in JSON logs)', () => {
			const out = redact({ fn: () => 1, sym: Symbol('s'), keep: 'ok' });
			expect(out).toEqual({ fn: undefined, sym: undefined, keep: 'ok' });
		});

		test('caps recursion at MAX_DEPTH with a [MAX_DEPTH] marker', () => {
			// Pathological inputs (self-referential graphs escaping the
			// cycle guard, or genuinely deep JSON like `JSON.parse` of a
			// huge response) must not blow the stack. The guard triggers
			// at depth 9 — level 9 from the root turns into the marker.
			const root: Record<string, unknown> = {};
			let node: Record<string, unknown> = root;
			for (let i = 0; i < 12; i++) {
				const next: Record<string, unknown> = {};
				node.child = next;
				node = next;
			}
			node.leaf = 'deep';

			const out = redact(root);
			let cur: unknown = out;
			let found = false;
			for (let i = 0; i < 12; i++) {
				if (cur === '[MAX_DEPTH]') {
					found = true;
					break;
				}
				if (typeof cur !== 'object' || cur === null) break;
				cur = (cur as Record<string, unknown>).child;
			}
			expect(found).toBe(true);
		});
	});
});
