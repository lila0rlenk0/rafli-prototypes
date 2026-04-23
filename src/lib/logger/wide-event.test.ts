import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import * as Sentry from '@sentry/nextjs';

import { createWideEvent, withWideEvent } from './wide-event';

/**
 * Wide-event tests focus on the observable side effect — one
 * structured log line on `stdout` (ok) or `stderr` (error/exception)
 * with the correct shape. Sentry scope mutations are exercised but
 * not asserted here; the `@sentry/nextjs` SDK no-ops without a DSN,
 * which is the test-env default, so the scope calls are safe to
 * execute without mocking.
 */

interface WriteSpy {
	readonly lines: string[];
	restore(): void;
}

function spyWrite(stream: 'stdout' | 'stderr'): WriteSpy {
	const target = process[stream];
	const original = target.write.bind(target);
	const lines: string[] = [];

	target.write = ((chunk: string | Uint8Array): boolean => {
		lines.push(
			typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk),
		);
		return true;
	}) as typeof target.write;

	return {
		lines,
		restore: () => {
			target.write = original;
		},
	};
}

function lastJson(spy: WriteSpy): Record<string, unknown> {
	const raw = spy.lines.at(-1);
	if (!raw) throw new Error('no log line captured');
	return JSON.parse(raw.trimEnd()) as Record<string, unknown>;
}

describe('createWideEvent', () => {
	let stdout: WriteSpy;
	let stderr: WriteSpy;

	beforeEach(() => {
		stdout = spyWrite('stdout');
		stderr = spyWrite('stderr');
	});

	afterEach(() => {
		stdout.restore();
		stderr.restore();
	});

	test('assigns a stable request_id that survives to emit', () => {
		const event = createWideEvent('auth', 'sign-in-user');
		expect(event.requestId.length).toBeGreaterThan(0);

		event.emit('ok');
		const payload = lastJson(stdout);
		expect(payload.request_id).toBe(event.requestId);
	});

	test('emit(ok) writes one line to stdout with service / action / outcome / duration_ms', () => {
		const event = createWideEvent('auth', 'sign-in-user');
		event.with({ method: 'email' });
		event.emit('ok');

		expect(stdout.lines).toHaveLength(1);
		expect(stderr.lines).toHaveLength(0);

		const payload = lastJson(stdout);
		// Base-context `app` carries the application identifier; the
		// wide-event's `service` carries the per-action domain. Both
		// must coexist without shadowing — that's the whole point of
		// keeping the two names distinct.
		expect(payload.app).toBe('raffly-web');
		expect(payload.service).toBe('auth');
		expect(payload.action).toBe('sign-in-user');
		expect(payload.outcome).toBe('ok');
		expect(payload.method).toBe('email');
		expect(typeof payload.duration_ms).toBe('number');
		// No error_code on the happy path — prevents query false-positives.
		expect(payload.error_code).toBeUndefined();
	});

	test('emit(error, code) routes to stderr and includes error_code', () => {
		const event = createWideEvent('payment', 'submit-crypto-tx');
		event.emit('error', 'payments:crypto:submit-failed');

		expect(stdout.lines).toHaveLength(0);
		expect(stderr.lines).toHaveLength(1);

		const payload = lastJson(stderr);
		expect(payload.level).toBe('error');
		expect(payload.outcome).toBe('error');
		expect(payload.error_code).toBe('payments:crypto:submit-failed');
	});

	test('setUser adds user_id to the payload', () => {
		const event = createWideEvent('auth', 'sign-in-user');
		event.setUser('user-123');
		event.emit('ok');

		const payload = lastJson(stdout);
		expect(payload.user_id).toBe('user-123');
	});

	test('is exactly-once: a second emit is a silent no-op', () => {
		// Double-emission would double-count requests in funnel queries;
		// the invariant is load-bearing for any downstream rate metric.
		const event = createWideEvent('auth', 'sign-in-user');
		event.emit('ok');
		event.emit('error', 'should-not-appear');

		expect(stdout.lines).toHaveLength(1);
		expect(stderr.lines).toHaveLength(0);
	});

	test('canonical fields cannot be shadowed by with() — query integrity', () => {
		// If a handler accidentally passes `outcome` or `service` in
		// `event.with({...})`, the canonical log line invariant breaks:
		// downstream `COUNT BY outcome` would include spoofed values.
		// This pins the contract: canonical fields always win.
		const event = createWideEvent('auth', 'sign-in-user');
		event.with({
			service: 'SPOOFED',
			action: 'SPOOFED',
			outcome: 'SPOOFED',
			request_id: 'SPOOFED',
			duration_ms: 999_999,
			error_code: 'SPOOFED',
			user_id: 'SPOOFED',
		});
		event.setUser('real-user');
		event.emit('ok');

		const payload = lastJson(stdout);
		expect(payload.service).toBe('auth');
		expect(payload.action).toBe('sign-in-user');
		expect(payload.outcome).toBe('ok');
		expect(payload.request_id).toBe(event.requestId);
		expect(payload.user_id).toBe('real-user');
		expect(payload.error_code).toBeUndefined();
		// duration_ms is the measured value — assert it's a reasonable
		// small number, not the spoofed 999_999.
		expect(payload.duration_ms).toBeLessThan(10_000);
	});
});

describe('withWideEvent', () => {
	let stdout: WriteSpy;
	let stderr: WriteSpy;

	beforeEach(() => {
		stdout = spyWrite('stdout');
		stderr = spyWrite('stderr');
	});

	afterEach(() => {
		stdout.restore();
		stderr.restore();
	});

	test('emits ok when the callback returns a successful ServiceResponse', async () => {
		const result = await withWideEvent(
			{ service: 'auth', action: 'sign-in-user' },
			async event => {
				event.with({ method: 'email' });
				return { success: true as const, data: 'ok' };
			},
		);

		expect(result.success).toBe(true);
		expect(stdout.lines).toHaveLength(1);

		const payload = lastJson(stdout);
		expect(payload.outcome).toBe('ok');
		expect(payload.method).toBe('email');
	});

	test('emits error with the domain error code when the callback returns a failure', async () => {
		const result = await withWideEvent(
			{ service: 'auth', action: 'sign-in-user' },
			async () =>
				({ success: false as const, error: 'invalid_credentials' }) as const,
		);

		expect(result.success).toBe(false);
		expect(stderr.lines).toHaveLength(1);

		const payload = lastJson(stderr);
		expect(payload.outcome).toBe('error');
		expect(payload.error_code).toBe('invalid_credentials');
	});

	test('stamps request_id / service / action on the active Sentry scope', async () => {
		// Contract test: the wrapper documents scope stamping so
		// `captureServiceError` inside the callback inherits the
		// correlation tags. Read the live scope from inside the
		// callback — Sentry's real `withScope` call is exercised, no
		// mocking needed (unit-test boundary preserved because
		// `@sentry/nextjs` scope manipulation is pure logic, no I/O).
		let capturedRequestId: string | undefined;
		let capturedService: string | undefined;
		let capturedAction: string | undefined;
		let expectedRequestId: string | undefined;

		await withWideEvent(
			{ service: 'payment', action: 'submit-crypto-tx' },
			async event => {
				expectedRequestId = event.requestId;
				const data = Sentry.getCurrentScope().getScopeData();
				const tags = data.tags as Record<string, string>;
				capturedRequestId = tags.request_id;
				capturedService = tags.service;
				capturedAction = tags.action;
				return { success: true as const };
			},
		);

		expect(capturedRequestId).toBe(expectedRequestId as string);
		expect(capturedService).toBe('payment');
		expect(capturedAction).toBe('submit-crypto-tx');
	});

	test('emits exception and rethrows when the callback throws', async () => {
		// The wrapper intentionally does NOT capture exceptions — the
		// service-action body is still responsible for
		// `captureServiceError` so Sentry fingerprinting stays
		// deterministic. This test pins the behaviour.
		let caught: Error | null = null;
		try {
			await withWideEvent(
				{ service: 'payment', action: 'submit-crypto-tx' },
				async () => {
					throw new Error('boom');
				},
			);
		} catch (err) {
			caught = err as Error;
		}

		expect(caught?.message).toBe('boom');
		expect(stderr.lines).toHaveLength(1);

		const payload = lastJson(stderr);
		expect(payload.outcome).toBe('exception');
		// No error_code on exception — there's no domain code yet.
		expect(payload.error_code).toBeUndefined();
	});
});
