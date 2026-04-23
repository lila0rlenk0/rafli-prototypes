import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

import { AUTO_RETRY_DELAY_S, createAutoRetryController } from './auto-retry';

describe('createAutoRetryController', () => {
	// Fake-clock swap — bun:test doesn't ship a fake-timer API, so we
	// shim setInterval/clearInterval/setTimeout/clearTimeout to a
	// controllable virtual clock. Each test installs fresh to avoid
	// cross-test leakage.
	let now = 0;
	type Task = {
		id: number;
		fireAt: number;
		kind: 'interval' | 'timeout';
		periodMs: number;
		fn: () => void;
	};
	let tasks: Map<number, Task>;
	let nextId: number;
	let realSetInterval: typeof setInterval;
	let realClearInterval: typeof clearInterval;
	let realSetTimeout: typeof setTimeout;
	let realClearTimeout: typeof clearTimeout;

	function advance(ms: number): void {
		const target = now + ms;
		// Fire tasks in order until we reach the target clock.
		for (;;) {
			const due = [...tasks.values()]
				.filter(t => t.fireAt <= target)
				.toSorted((a, b) => a.fireAt - b.fireAt);
			if (due.length === 0) break;
			const next = due[0];
			if (!next) break;
			now = next.fireAt;
			if (next.kind === 'interval') {
				next.fireAt = now + next.periodMs;
			} else {
				tasks.delete(next.id);
			}
			next.fn();
		}
		now = target;
	}

	beforeEach(() => {
		now = 0;
		tasks = new Map();
		nextId = 1;
		realSetInterval = globalThis.setInterval;
		realClearInterval = globalThis.clearInterval;
		realSetTimeout = globalThis.setTimeout;
		realClearTimeout = globalThis.clearTimeout;
		// Cast via `unknown` — swapping the global signature is a
		// test-only concern; the controller only uses the call shape
		// supported by both Node and browser runtimes.
		globalThis.setInterval = mock((fn: () => void, ms: number) => {
			const id = nextId++;
			tasks.set(id, {
				id,
				kind: 'interval',
				fireAt: now + ms,
				periodMs: ms,
				fn,
			});
			return id as unknown as ReturnType<typeof setInterval>;
		}) as unknown as typeof setInterval;
		globalThis.clearInterval = mock((id: unknown) => {
			tasks.delete(id as number);
		}) as unknown as typeof clearInterval;
		globalThis.setTimeout = mock((fn: () => void, ms: number) => {
			const id = nextId++;
			tasks.set(id, {
				id,
				kind: 'timeout',
				fireAt: now + ms,
				periodMs: ms,
				fn,
			});
			return id as unknown as ReturnType<typeof setTimeout>;
		}) as unknown as typeof setTimeout;
		globalThis.clearTimeout = mock((id: unknown) => {
			tasks.delete(id as number);
		}) as unknown as typeof clearTimeout;
	});
	afterEach(() => {
		globalThis.setInterval = realSetInterval;
		globalThis.clearInterval = realClearInterval;
		globalThis.setTimeout = realSetTimeout;
		globalThis.clearTimeout = realClearTimeout;
	});

	describe('scheduling', () => {
		test('onTick is called with the initial delay synchronously', () => {
			const controller = createAutoRetryController();
			const ticks: number[] = [];
			controller.start(
				n => ticks.push(n),
				() => {},
			);
			expect(ticks[0]).toBe(AUTO_RETRY_DELAY_S);
			expect(controller.isActive()).toBe(true);
		});

		test('onTick decrements every second, onFire runs exactly once on next macrotask', () => {
			const controller = createAutoRetryController();
			const ticks: number[] = [];
			const fire = mock(() => {});
			controller.start(n => ticks.push(n), fire);
			// Advance the full countdown — should emit 15, 14, ..., 1, 0.
			advance(AUTO_RETRY_DELAY_S * 1_000);
			// Deferred fire scheduled via setTimeout(0) — flush next macrotask.
			advance(0);
			expect(ticks).toEqual([
				AUTO_RETRY_DELAY_S,
				14,
				13,
				12,
				11,
				10,
				9,
				8,
				7,
				6,
				5,
				4,
				3,
				2,
				1,
				0,
			]);
			expect(fire).toHaveBeenCalledTimes(1);
		});
	});

	describe('cancellation', () => {
		test('cancel() clears the interval and suppresses onFire', () => {
			const controller = createAutoRetryController();
			const fire = mock(() => {});
			controller.start(() => {}, fire);
			controller.cancel();
			advance(AUTO_RETRY_DELAY_S * 1_000 + 1_000);
			expect(fire).toHaveBeenCalledTimes(0);
			expect(controller.isActive()).toBe(false);
		});

		test('cancel() mid-countdown stops interval before it reaches zero', () => {
			const controller = createAutoRetryController();
			const fire = mock(() => {});
			controller.start(() => {}, fire);
			// Advance halfway — interval has ticked but not yet fired.
			advance(7_000);
			controller.cancel();
			// Finish the remaining window — nothing should fire since
			// cancel cleared the interval before it could reach zero.
			advance(AUTO_RETRY_DELAY_S * 1_000);
			expect(fire).toHaveBeenCalledTimes(0);
		});

		test('cancel() is safe to call before start and multiple times', () => {
			const controller = createAutoRetryController();
			// No throws; no-ops.
			controller.cancel();
			controller.cancel();
			expect(controller.isActive()).toBe(false);
		});
	});

	describe('max attempts (single fire per start)', () => {
		test('each start() fires onFire at most once', () => {
			const controller = createAutoRetryController();
			const fire = mock(() => {});
			controller.start(() => {}, fire);
			// Run far past the original window — no second fire should appear.
			advance(AUTO_RETRY_DELAY_S * 5_000);
			expect(fire).toHaveBeenCalledTimes(1);
		});

		test('re-calling start() cancels the prior countdown first', () => {
			const controller = createAutoRetryController();
			const firstFire = mock(() => {});
			const secondFire = mock(() => {});
			controller.start(() => {}, firstFire);
			// Midway through the first countdown, restart with a new fire callback.
			advance(5_000);
			controller.start(() => {}, secondFire);
			advance(AUTO_RETRY_DELAY_S * 1_000);
			advance(0);
			expect(firstFire).toHaveBeenCalledTimes(0);
			expect(secondFire).toHaveBeenCalledTimes(1);
		});
	});
});
