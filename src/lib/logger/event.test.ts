import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import { createWideEvent, emitWideEvent } from './event';

describe('createWideEvent', () => {
	test('populates identity fields', () => {
		const event = createWideEvent('req-123', 'payment', 'pay-with-credits');

		expect(event.requestId).toBe('req-123');
		expect(event.service).toBe('payment');
		expect(event.action).toBe('pay-with-credits');
		expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
	});

	test('initializes all optional fields to null', () => {
		const event = createWideEvent('req-1', 'test', 'test');

		expect(event.userId).toBeNull();
		expect(event.clientIp).toBeNull();
		expect(event.success).toBeNull();
		expect(event.errorCode).toBeNull();
		expect(event.errorSource).toBeNull();
		expect(event.httpStatus).toBeNull();
		expect(event.durationMs).toBeNull();
		expect(event.method).toBeNull();
		expect(event.endpoint).toBeNull();
		expect(event.retryCount).toBeNull();
	});

	test('event is mutable for enrichment', () => {
		const event = createWideEvent('req-1', 'raffle', 'get-raffle');

		event.userId = 'user-42';
		event.success = true;
		event.durationMs = 150;

		expect(event.userId).toBe('user-42');
		expect(event.success).toBe(true);
		expect(event.durationMs).toBe(150);
	});
});

describe('emitWideEvent', () => {
	let originalLog: typeof console.log;
	let logged: string;

	beforeEach(() => {
		logged = '';
		originalLog = console.log;
		// Intercept console.log to capture the JSON output
		// (emitWideEvent uses console.log for Edge Runtime compatibility)
		console.log = (...args: unknown[]) => {
			logged += args.map(String).join(' ');
		};
	});

	afterEach(() => {
		console.log = originalLog;
	});

	test('emits single JSON line to stdout', () => {
		const event = createWideEvent('req-1', 'test', 'action');
		event.success = true;
		event.durationMs = 42;

		emitWideEvent(event);

		const parsed = JSON.parse(logged.trim());
		expect(parsed.requestId).toBe('req-1');
		expect(parsed.service).toBe('test');
		expect(parsed.action).toBe('action');
		expect(parsed.success).toBe(true);
		expect(parsed.durationMs).toBe(42);
	});

	test('includes business context in extras', () => {
		const event = createWideEvent('req-1', 'payment', 'pay');
		// Add business context via the extras bag
		event.extras.orderId = 'order-99';
		event.extras.amount = 1_500;

		emitWideEvent(event);

		const parsed = JSON.parse(logged.trim());
		expect(parsed.extras.orderId).toBe('order-99');
		expect(parsed.extras.amount).toBe(1_500);
	});
});
