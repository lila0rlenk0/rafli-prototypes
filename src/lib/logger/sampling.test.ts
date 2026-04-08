import { describe, expect, test } from 'bun:test';

import type { WideEvent } from './event';
import { shouldSample } from './sampling';

/**
 * Creates a minimal WideEvent with defaults.
 * Override fields relevant to each test case.
 */
function createEvent(overrides: Partial<WideEvent> = {}): WideEvent {
	return {
		requestId: 'test-id',
		timestamp: '2026-04-08T00:00:00.000Z',
		service: 'test',
		action: 'test-action',
		userId: null,
		clientIp: null,
		success: true,
		errorCode: null,
		errorSource: null,
		httpStatus: null,
		durationMs: 100,
		method: null,
		endpoint: null,
		retryCount: null,
		extras: {},
		...overrides,
	};
}

describe('shouldSample', () => {
	describe('always keeps failures', () => {
		test('keeps failed events', () => {
			const event = createEvent({ success: false, errorCode: 'some_error' });
			// Run 100 times — must always return true
			for (let i = 0; i < 100; i++) {
				expect(shouldSample(event)).toBe(true);
			}
		});
	});

	describe('always keeps contract drift', () => {
		test('keeps events with zod errorSource', () => {
			const event = createEvent({ success: true, errorSource: 'zod' });
			for (let i = 0; i < 100; i++) {
				expect(shouldSample(event)).toBe(true);
			}
		});
	});

	describe('always keeps slow actions', () => {
		test('keeps events above 5s threshold', () => {
			const event = createEvent({ success: true, durationMs: 5_001 });
			for (let i = 0; i < 100; i++) {
				expect(shouldSample(event)).toBe(true);
			}
		});

		test('does not force-keep events at exactly 5s', () => {
			// At 5000ms exactly, the event is NOT above threshold — subject to random sampling.
			// Over 200 runs at 5% sample rate, most should be dropped.
			const event = createEvent({ success: true, durationMs: 5_000 });
			let kept = 0;
			for (let i = 0; i < 200; i++) {
				if (shouldSample(event)) kept++;
			}
			// 5% of 200 = ~10, allow generous margin
			expect(kept).toBeLessThan(50);
		});
	});

	describe('samples successful events at ~5%', () => {
		test('keeps roughly 5% of successful events', () => {
			const event = createEvent({ success: true, durationMs: 100 });
			let kept = 0;
			const runs = 2_000;
			for (let i = 0; i < runs; i++) {
				if (shouldSample(event)) kept++;
			}
			// 5% of 2000 = 100 ± generous margin
			expect(kept).toBeGreaterThan(30);
			expect(kept).toBeLessThan(200);
		});
	});
});
