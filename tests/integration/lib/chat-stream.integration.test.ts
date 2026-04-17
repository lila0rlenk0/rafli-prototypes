import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

import type { ChatStreamConfig } from '@/lib/chat-stream';

// Stub clientEnv BEFORE the stream module is imported so `buildWsUrl`
// reads a deterministic backend URL.
mock.module('@/env/client', () => ({
	clientEnv: {
		NEXT_PUBLIC_BACKEND_URL: 'https://api.example.com',
		NODE_ENV: 'test',
	},
}));

// ============================================================
// Timer + WebSocket test doubles — mirrors notification-stream tests
// ============================================================

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

function flushNextTimer(): void {
	const first = pendingTimers.entries().next();
	if (first.done) return;
	const [id, entry] = first.value;
	if (!entry.repeating) pendingTimers.delete(id);
	entry.fn();
}

function pendingTimerCount(): number {
	return pendingTimers.size;
}

/**
 * Minimal WebSocket fake — exposes readyState + capture of sent frames so
 * tests can assert whether a frame actually reached the wire.
 */
class FakeWebSocket {
	static readonly CONNECTING = 0;
	static readonly OPEN = 1;
	static readonly CLOSING = 2;
	static readonly CLOSED = 3;

	static instances: FakeWebSocket[] = [];
	static get latest(): FakeWebSocket {
		return FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
	}

	readonly url: string;
	readyState: number = FakeWebSocket.CONNECTING;
	sentFrames: string[] = [];
	closedWith: { code?: number; reason?: string } | null = null;
	onopen: ((ev: Event) => void) | null = null;
	onmessage: ((ev: MessageEvent) => void) | null = null;
	onclose: ((ev: CloseEvent) => void) | null = null;
	onerror: ((ev: Event) => void) | null = null;

	constructor(url: string) {
		this.url = url;
		FakeWebSocket.instances.push(this);
	}

	send(data: string): void {
		this.sentFrames.push(data);
	}

	close(code?: number, reason?: string): void {
		this.closedWith = { code, reason };
		this.readyState = FakeWebSocket.CLOSED;
	}

	triggerOpen(): void {
		this.readyState = FakeWebSocket.OPEN;
		this.onopen?.({} as Event);
	}

	triggerClose(code = 1006, reason = ''): void {
		this.readyState = FakeWebSocket.CLOSED;
		this.onclose?.({ code, reason, wasClean: false } as CloseEvent);
	}
}

// ============================================================
// Globals save/restore
// ============================================================

const originals = {
	setTimeout: globalThis.setTimeout,
	clearTimeout: globalThis.clearTimeout,
	setInterval: globalThis.setInterval,
	clearInterval: globalThis.clearInterval,
	WebSocket: globalThis.WebSocket,
};

// Import AFTER mocks so the module picks up the stubbed env.
const { ChatStream, buildWsUrl } = await import('@/lib/chat-stream');

beforeEach(() => {
	timerId = 0;
	pendingTimers.clear();
	FakeWebSocket.instances = [];

	Object.assign(globalThis, {
		setTimeout: fakeSetTimeout,
		clearTimeout: fakeClearTimeout,
		setInterval: fakeSetInterval,
		clearInterval: fakeClearInterval,
		WebSocket: FakeWebSocket,
	});
});

afterEach(() => {
	Object.assign(globalThis, originals);
});

function makeConfig(
	overrides?: Partial<ChatStreamConfig>,
): ChatStreamConfig & {
	onEvent: ReturnType<typeof mock>;
	getToken: ReturnType<typeof mock>;
	onConnected: ReturnType<typeof mock>;
	onDisconnected: ReturnType<typeof mock>;
} {
	const onEvent = mock();
	const getToken = mock(async () => ({ token: 'tok-1', expiresIn: 300 }));
	const onConnected = mock();
	const onDisconnected = mock();

	return {
		onEvent,
		getToken,
		onConnected,
		onDisconnected,
		...overrides,
	};
}

async function drainMicrotasks(): Promise<void> {
	await Promise.resolve();
	await Promise.resolve();
	await Promise.resolve();
}

describe('ChatStream', () => {
	describe('send return value', () => {
		// Regression: `send()` used to return void so the transport blindly
		// returned `true` to the caller. When the socket silently dropped
		// the frame (readyState !== OPEN), the optimistic "sending…" bubble
		// stuck forever and the REST fallback never engaged.
		test('returns false when socket is not yet OPEN', async () => {
			const config = makeConfig();
			const stream = new ChatStream(config);
			await stream.connect();
			await drainMicrotasks();

			// CONNECTING — pre-open.
			const dispatched = stream.send({ type: 'heartbeat' });

			expect(dispatched).toBe(false);
			expect(FakeWebSocket.latest.sentFrames).toHaveLength(0);
		});

		test('returns true and writes the frame once socket is OPEN', async () => {
			const config = makeConfig();
			const stream = new ChatStream(config);
			await stream.connect();
			await drainMicrotasks();

			FakeWebSocket.latest.triggerOpen();
			const dispatched = stream.send({ type: 'heartbeat' });

			expect(dispatched).toBe(true);
			expect(FakeWebSocket.latest.sentFrames).toEqual([
				JSON.stringify({ type: 'heartbeat' }),
			]);
		});

		test('returns false after the socket has closed', async () => {
			const config = makeConfig();
			const stream = new ChatStream(config);
			await stream.connect();
			await drainMicrotasks();

			FakeWebSocket.latest.triggerOpen();
			FakeWebSocket.latest.triggerClose(1006, 'Gone');

			// After the close handler runs, `this.ws` is nulled so send() drops.
			const dispatched = stream.send({ type: 'heartbeat' });

			expect(dispatched).toBe(false);
		});
	});

	describe('buildWsUrl hardening', () => {
		const TOKEN = 'tok-abc123';

		describe('production origins', () => {
			test('rewrites https:// to wss:// and appends token', () => {
				expect(buildWsUrl('https://api.example.com', TOKEN)).toBe(
					'wss://api.example.com/api/v1/chat/stream?token=tok-abc123',
				);
			});

			test('accepts an already-wss:// origin', () => {
				expect(buildWsUrl('wss://api.example.com', TOKEN)).toBe(
					'wss://api.example.com/api/v1/chat/stream?token=tok-abc123',
				);
			});

			test('encodes token reserved characters to avoid query-string injection', () => {
				// Tokens are opaque but the server may mint characters like
				// `+`, `/`, `&`, `=`. Without encoding, a `&extra=` in the
				// token could be reinterpreted as a second query param and
				// leak to logging middleware keyed on unexpected params.
				const result = buildWsUrl('https://api.example.com', 'a&b=c d');
				expect(result).toBe(
					'wss://api.example.com/api/v1/chat/stream?token=a%26b%3Dc%20d',
				);
			});
		});

		describe('localhost dev origins', () => {
			test('allows ws://localhost with a port', () => {
				expect(buildWsUrl('http://localhost:4000', TOKEN)).toBe(
					'ws://localhost:4000/api/v1/chat/stream?token=tok-abc123',
				);
			});

			test('allows ws://localhost without a port', () => {
				expect(buildWsUrl('http://localhost', TOKEN)).toBe(
					'ws://localhost/api/v1/chat/stream?token=tok-abc123',
				);
			});

			test('allows ws://localhost with a path prefix', () => {
				// Some dev proxies front with a path prefix; still local,
				// still safe from the downgrade risk we're guarding against.
				expect(buildWsUrl('http://localhost/edge', TOKEN)).toBe(
					'ws://localhost/edge/api/v1/chat/stream?token=tok-abc123',
				);
			});

			// 127.0.0.1 is accepted alongside localhost so devs can sidestep
			// Node's IPv6-first DNS stall against IPv4-only dev backends.
			test('allows ws://127.0.0.1 with a port', () => {
				expect(buildWsUrl('http://127.0.0.1:4000', TOKEN)).toBe(
					'ws://127.0.0.1:4000/api/v1/chat/stream?token=tok-abc123',
				);
			});

			test('allows ws://127.0.0.1 without a port', () => {
				expect(buildWsUrl('http://127.0.0.1', TOKEN)).toBe(
					'ws://127.0.0.1/api/v1/chat/stream?token=tok-abc123',
				);
			});

			test('allows ws://127.0.0.1 with a path prefix', () => {
				expect(buildWsUrl('http://127.0.0.1/edge', TOKEN)).toBe(
					'ws://127.0.0.1/edge/api/v1/chat/stream?token=tok-abc123',
				);
			});
		});

		describe('downgrade defence', () => {
			// Regression: `startsWith('ws://localhost')` accepted
			// `ws://localhost.attacker.com`, silently downgrading the stream
			// to plaintext. The token is then exfiltrable on any MITM'd hop.
			test('rejects ws://localhost.attacker.com lookalike', () => {
				expect(() =>
					buildWsUrl('http://localhost.attacker.com', TOKEN),
				).toThrow(/wss:\/\//);
			});

			test('rejects ws://localhost-evil (hyphen-extended lookalike)', () => {
				expect(() => buildWsUrl('http://localhost-evil', TOKEN)).toThrow(
					/wss:\/\//,
				);
			});

			test('rejects ws://127.0.0.1.attacker.com lookalike', () => {
				expect(() =>
					buildWsUrl('http://127.0.0.1.attacker.com', TOKEN),
				).toThrow(/wss:\/\//);
			});

			test('rejects ws://127.0.0.11 (digit-extended lookalike)', () => {
				expect(() => buildWsUrl('http://127.0.0.11', TOKEN)).toThrow(
					/wss:\/\//,
				);
			});

			test('rejects plain http:// remote backends', () => {
				expect(() => buildWsUrl('http://api.example.com', TOKEN)).toThrow(
					/wss:\/\//,
				);
			});

			test('rejects ws:// to a non-localhost host', () => {
				expect(() => buildWsUrl('ws://api.example.com', TOKEN)).toThrow(
					/wss:\/\//,
				);
			});
		});
	});

	describe('token-refresh failure recovery', () => {
		// Regression: proactive token refresh detached+closed the old socket
		// then asked for a new token. If that token fetch returned null
		// (token-service outage), `fetchTokenAndConnect` bailed early and
		// the stream was permanently dead — no `onclose` (handlers were
		// pre-detached), no `onDisconnected`, no reconnect scheduled. The
		// store stayed `connected: true` against a non-existent socket.
		test('fires onDisconnected and schedules a reconnect when refresh token fetch fails', async () => {
			let callIndex = 0;
			const getToken = mock(async () => {
				callIndex++;
				// Step 1: First connect succeeds (short-lived token to trigger
				// the refresh timer on the very first tick).
				if (callIndex === 1) return { token: 'tok-1', expiresIn: 1 };
				// Step 2: Subsequent refresh attempt fails.
				return null;
			});

			const config = makeConfig({ getToken });
			const stream = new ChatStream(config);

			await stream.connect();
			await drainMicrotasks();
			FakeWebSocket.latest.triggerOpen();

			// Step 3: Trigger the token-refresh timer. It detaches+closes
			// the old socket and calls fetchTokenAndConnect, which now
			// returns early because getToken resolved null.
			flushNextTimer();
			await drainMicrotasks();

			// Step 4: Store must observe the disconnection so UI can reflect it.
			expect(config.onDisconnected).toHaveBeenCalledTimes(1);
			// Step 5: A reconnect must be scheduled so a later token-service
			// recovery actually recovers the stream.
			expect(pendingTimerCount()).toBeGreaterThan(0);
		});
	});
});
