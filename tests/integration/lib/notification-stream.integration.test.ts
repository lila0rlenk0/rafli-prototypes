import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

import type { NotificationStreamConfig } from '@/lib/notifications/stream';

// --- Env mock — controls buildWsUrl and isDev ---

mock.module('@/env/client', () => ({
	clientEnv: {
		NEXT_PUBLIC_BACKEND_URL: 'https://api.example.com',
		NODE_ENV: 'test',
	},
}));

// ============================================================
// Timer + WebSocket test doubles
// ============================================================

/**
 * Fake scheduler that collects setTimeout/setInterval callbacks so tests
 * can advance time deterministically without real delays.
 */
interface PendingTimer {
	fn: () => void;
	delay: number;
	repeating: boolean;
}

let timerId = 0;
const pendingTimers = new Map<number, PendingTimer>();

function fakeSetTimeout(fn: () => void, delay: number): number {
	const id = ++timerId;
	pendingTimers.set(id, { fn, delay, repeating: false });
	return id;
}

function fakeClearTimeout(id: number): void {
	pendingTimers.delete(id);
}

function fakeSetInterval(fn: () => void, delay: number): number {
	const id = ++timerId;
	pendingTimers.set(id, { fn, delay, repeating: true });
	return id;
}

function fakeClearInterval(id: number): void {
	pendingTimers.delete(id);
}

/** Execute the next pending timer (FIFO by insertion order). */
function flushNextTimer(): void {
	const first = pendingTimers.entries().next();
	if (first.done) return;

	const [id, entry] = first.value;
	if (!entry.repeating) pendingTimers.delete(id);
	entry.fn();
}

/** Execute all pending timers once (snapshot — new timers scheduled during flush are NOT run). */
function flushAllTimers(): void {
	const snapshot = [...pendingTimers.entries()];
	for (const [id, entry] of snapshot) {
		if (!entry.repeating) pendingTimers.delete(id);
		entry.fn();
	}
}

/** Number of pending timers. */
function pendingTimerCount(): number {
	return pendingTimers.size;
}

/**
 * Minimal WebSocket fake that captures the URL and exposes trigger helpers.
 * Replaces `globalThis.WebSocket` during tests.
 */
class FakeWebSocket {
	static instances: FakeWebSocket[] = [];
	static get latest(): FakeWebSocket {
		return FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
	}

	readonly url: string;
	onopen: ((ev: Event) => void) | null = null;
	onmessage: ((ev: MessageEvent) => void) | null = null;
	onclose: ((ev: CloseEvent) => void) | null = null;
	onerror: ((ev: Event) => void) | null = null;
	closedWith: { code?: number; reason?: string } | null = null;

	constructor(url: string) {
		this.url = url;
		FakeWebSocket.instances.push(this);
	}

	close(code?: number, reason?: string): void {
		this.closedWith = { code, reason };
	}

	// --- Trigger helpers ---

	triggerOpen(): void {
		this.onopen?.({} as Event);
	}

	triggerMessage(data: string): void {
		this.onmessage?.({ data } as MessageEvent);
	}

	triggerClose(code = 1006, reason = ''): void {
		this.onclose?.({ code, reason, wasClean: false } as CloseEvent);
	}

	triggerTokenRefreshClose(): void {
		this.onclose?.({ code: 1000, reason: 'Token refresh', wasClean: true } as CloseEvent);
	}
}

// ============================================================
// Globals save/restore
// ============================================================

// Snapshot originals before replacing — Object.assign sidesteps the
// Timer vs number mismatch without needing explicit `any` casts.
const originals = {
	setTimeout: globalThis.setTimeout,
	clearTimeout: globalThis.clearTimeout,
	setInterval: globalThis.setInterval,
	clearInterval: globalThis.clearInterval,
	WebSocket: globalThis.WebSocket,
};

// Dynamic import AFTER mock.module — but BEFORE globals replacement,
// since the module captures nothing at import time.
const { NotificationStream } = await import('@/lib/notifications/stream');

beforeEach(() => {
	timerId = 0;
	pendingTimers.clear();
	FakeWebSocket.instances = [];

	// Replace globals with fakes — the class reads them lazily
	// (setTimeout is called inside methods, not at module-load time).
	Object.assign(globalThis, {
		setTimeout: fakeSetTimeout,
		clearTimeout: fakeClearTimeout,
		setInterval: fakeSetInterval,
		clearInterval: fakeClearInterval,
		WebSocket: FakeWebSocket,
	});
});

afterEach(() => {
	// Restore real globals so later test files aren't affected
	Object.assign(globalThis, originals);
});

// ============================================================
// Helpers
// ============================================================

/** Standard test config with fresh mocks. */
function makeConfig(overrides?: Partial<NotificationStreamConfig>): {
	onNewNotification: NotificationStreamConfig['onNewNotification'] &
		ReturnType<typeof mock>;
	getToken: NotificationStreamConfig['getToken'] & ReturnType<typeof mock>;
	onReconnected: NonNullable<NotificationStreamConfig['onReconnected']> &
		ReturnType<typeof mock>;
} {
	const defaults = {
		onNewNotification: mock() as NotificationStreamConfig['onNewNotification'] &
			ReturnType<typeof mock>,
		getToken: mock(async () => ({
			token: 'tok-1',
			expiresIn: 300,
		})) as NotificationStreamConfig['getToken'] & ReturnType<typeof mock>,
		onReconnected: mock() as NonNullable<
			NotificationStreamConfig['onReconnected']
		> &
			ReturnType<typeof mock>,
	};
	return { ...defaults, ...overrides } as typeof defaults;
}

// ============================================================
// Tests
// ============================================================

describe('NotificationStream', () => {
	describe('connect', () => {
		test('fetches token and opens WebSocket to correct URL', async () => {
			const config = makeConfig();
			const stream = new NotificationStream(config);

			await stream.connect();

			expect(config.getToken).toHaveBeenCalledTimes(1);
			expect(FakeWebSocket.instances).toHaveLength(1);
			// URL: wss://api.example.com/api/v1/me/notifications/stream?token=tok-1
			expect(FakeWebSocket.latest.url).toContain('wss://api.example.com');
			expect(FakeWebSocket.latest.url).toContain('token=tok-1');
		});

		test('does not open WebSocket when getToken returns null', async () => {
			const config = makeConfig({
				getToken: mock(async () => null),
			});
			const stream = new NotificationStream(config);

			await stream.connect();

			expect(FakeWebSocket.instances).toHaveLength(0);
		});

		test('builds wss:// URL from https:// backend', async () => {
			const config = makeConfig();
			const stream = new NotificationStream(config);

			await stream.connect();

			expect(FakeWebSocket.latest.url).toStartWith('wss://');
		});
	});

	describe('message handling', () => {
		test('fires onNewNotification for new_notification events', async () => {
			const config = makeConfig();
			const stream = new NotificationStream(config);

			await stream.connect();
			FakeWebSocket.latest.triggerOpen();
			FakeWebSocket.latest.triggerMessage(
				JSON.stringify({ event: 'new_notification' }),
			);

			expect(config.onNewNotification).toHaveBeenCalledTimes(1);
		});

		test('ignores heartbeat events', async () => {
			const config = makeConfig();
			const stream = new NotificationStream(config);

			await stream.connect();
			FakeWebSocket.latest.triggerOpen();
			FakeWebSocket.latest.triggerMessage(
				JSON.stringify({ event: 'heartbeat' }),
			);

			expect(config.onNewNotification).not.toHaveBeenCalled();
		});

		test('silently ignores malformed JSON', async () => {
			const config = makeConfig();
			const stream = new NotificationStream(config);

			await stream.connect();
			FakeWebSocket.latest.triggerOpen();

			// Must not throw — malformed frames are discarded
			expect(() => {
				FakeWebSocket.latest.triggerMessage('not-json{{{');
			}).not.toThrow();
			expect(config.onNewNotification).not.toHaveBeenCalled();
		});

		test('silently ignores unknown event types', async () => {
			const config = makeConfig();
			const stream = new NotificationStream(config);

			await stream.connect();
			FakeWebSocket.latest.triggerOpen();
			// Zod parse succeeds (event is z.enum) only for new_notification | heartbeat
			FakeWebSocket.latest.triggerMessage(
				JSON.stringify({ event: 'unknown_type' }),
			);

			expect(config.onNewNotification).not.toHaveBeenCalled();
		});
	});

	describe('disconnect', () => {
		test('closes WebSocket with 1000 code and prevents reconnect', async () => {
			const config = makeConfig();
			const stream = new NotificationStream(config);

			await stream.connect();
			stream.disconnect();

			expect(FakeWebSocket.latest.closedWith?.code).toBe(1000);
			expect(FakeWebSocket.latest.closedWith?.reason).toBe(
				'Client disconnect',
			);
		});

		test('clears all pending timers', async () => {
			const config = makeConfig();
			const stream = new NotificationStream(config);

			await stream.connect();
			// Token refresh timer was scheduled
			expect(pendingTimerCount()).toBeGreaterThan(0);

			stream.disconnect();
			expect(pendingTimerCount()).toBe(0);
		});

		test('does not reconnect after disconnect even if close event fires', async () => {
			const config = makeConfig();
			const stream = new NotificationStream(config);

			await stream.connect();
			const ws = FakeWebSocket.latest;
			stream.disconnect();
			// Simulate the close event firing after disconnect — should be ignored
			ws.triggerClose(1006, 'Connection lost');

			// No new timers scheduled for reconnection
			expect(pendingTimerCount()).toBe(0);
			// No new WebSocket connections attempted
			expect(FakeWebSocket.instances).toHaveLength(1);
		});
	});

	describe('reconnection with exponential backoff', () => {
		test('schedules reconnect after unexpected close', async () => {
			const config = makeConfig();
			const stream = new NotificationStream(config);

			await stream.connect();
			FakeWebSocket.latest.triggerOpen();
			FakeWebSocket.latest.triggerClose(1006, 'Gone');

			// Reconnect timer scheduled (1s base delay)
			expect(pendingTimerCount()).toBe(1);
		});

		test('fetches fresh token on each reconnect attempt', async () => {
			const config = makeConfig();
			const stream = new NotificationStream(config);

			await stream.connect();
			FakeWebSocket.latest.triggerOpen();
			FakeWebSocket.latest.triggerClose(1006, 'Gone');

			// Flush the reconnect timer
			config.getToken.mockClear();
			await flushAndDrainAsync();

			expect(config.getToken).toHaveBeenCalledTimes(1);
			expect(FakeWebSocket.instances).toHaveLength(2);
		});

		test('falls back to slow polling after 5 consecutive failures', async () => {
			const config = makeConfig();
			const stream = new NotificationStream(config);

			await stream.connect();

			// 5 reconnect attempts exhaust the counter (0→1→2→3→4→5)
			for (let i = 0; i < 5; i++) {
				FakeWebSocket.latest.triggerClose(1006, 'Gone');
				await flushAndDrainAsync();
			}

			// 6th close: reconnectAttempts=5 ≥ MAX_RECONNECT_ATTEMPTS → enters poll fallback
			FakeWebSocket.latest.triggerClose(1006, 'Gone');

			// Poll fallback fires onNewNotification on each interval tick
			const countBefore = config.onNewNotification.mock.calls.length;
			await flushAndDrainAsync();
			expect(config.onNewNotification.mock.calls.length).toBeGreaterThan(
				countBefore,
			);
		});
	});

	describe('poll fallback recovery', () => {
		test('calls onReconnected when WebSocket recovers from poll fallback', async () => {
			const config = makeConfig();
			const stream = new NotificationStream(config);

			await stream.connect();

			// Exhaust reconnect attempts → 6th close enters poll fallback
			for (let i = 0; i < 5; i++) {
				FakeWebSocket.latest.triggerClose(1006, 'Gone');
				await flushAndDrainAsync();
			}
			FakeWebSocket.latest.triggerClose(1006, 'Gone');

			// Poll tick probes WS recovery — fires onNewNotification + tries to reconnect
			await flushAndDrainAsync();
			// The probe created a new WS — simulate successful open
			FakeWebSocket.latest.triggerOpen();

			expect(config.onReconnected).toHaveBeenCalledTimes(1);
		});
	});

	describe('token refresh', () => {
		test('schedules proactive refresh at 80% of expiry', async () => {
			const config = makeConfig({
				getToken: mock(async () => ({ token: 'tok-1', expiresIn: 100 })),
			});
			const stream = new NotificationStream(config);

			await stream.connect();

			// Token refresh scheduled — 100 * 0.8 * 1000 = 80_000ms
			const refreshTimer = [...pendingTimers.values()].find(
				t => !t.repeating && t.delay === 80_000,
			);
			expect(refreshTimer).toBeDefined();
		});

		test('does not count refresh as a reconnect attempt', async () => {
			const config = makeConfig({
				getToken: mock(async () => ({ token: 'tok-1', expiresIn: 1 })),
			});
			const stream = new NotificationStream(config);

			await stream.connect();
			FakeWebSocket.latest.triggerOpen();

			// Token refresh fires
			const ws1 = FakeWebSocket.latest;
			config.getToken.mockClear();
			// Flush the refresh timer
			flushAllTimers();
			await drainMicrotasks();

			// The old WS was closed with "Token refresh" reason
			expect(ws1.closedWith?.reason).toBe('Token refresh');
			// A new connection was opened (not counted as failed attempt)
			expect(FakeWebSocket.instances.length).toBeGreaterThan(1);
		});
	});
});

// ============================================================
// Utilities
// ============================================================

/**
 * Flush next timer and drain the microtask queue so async callbacks
 * (like getToken) complete before the next assertion.
 */
async function flushAndDrainAsync(): Promise<void> {
	flushNextTimer();
	await drainMicrotasks();
}

async function drainMicrotasks(): Promise<void> {
	await Promise.resolve();
	await Promise.resolve();
	await Promise.resolve();
}
