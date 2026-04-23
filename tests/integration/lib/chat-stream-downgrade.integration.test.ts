import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

// Stub clientEnv with a plaintext-http origin BEFORE importing chat-stream.
// `buildWsUrl` refuses to downgrade to `ws://` on non-localhost hosts, so
// the downstream `new WebSocket(...)` call throws synchronously — exactly
// the failure mode this suite guards against.
mock.module('@/env/client', () => ({
	clientEnv: {
		NEXT_PUBLIC_BACKEND_URL: 'http://api.example.com',
		NODE_ENV: 'test',
	},
}));

// ============================================================
// Test doubles — minimal timer + WebSocket fakes (mirror the main suite)
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

function pendingTimerCount(): number {
	return pendingTimers.size;
}

class FakeWebSocket {
	static readonly CONNECTING = 0;
	static readonly OPEN = 1;
	static readonly CLOSING = 2;
	static readonly CLOSED = 3;
	static instances: FakeWebSocket[] = [];

	readonly url: string;
	readyState: number = FakeWebSocket.CONNECTING;
	onopen: ((ev: Event) => void) | null = null;
	onmessage: ((ev: MessageEvent) => void) | null = null;
	onclose: ((ev: CloseEvent) => void) | null = null;
	onerror: ((ev: Event) => void) | null = null;

	constructor(url: string) {
		this.url = url;
		FakeWebSocket.instances.push(this);
	}

	send(): void {}
	close(): void {
		this.readyState = FakeWebSocket.CLOSED;
	}
}

const originals = {
	setTimeout: globalThis.setTimeout,
	clearTimeout: globalThis.clearTimeout,
	setInterval: globalThis.setInterval,
	clearInterval: globalThis.clearInterval,
	WebSocket: globalThis.WebSocket,
};

const { ChatStream } = await import('@/lib/chat/stream');

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

async function drainMicrotasks(): Promise<void> {
	await Promise.resolve();
	await Promise.resolve();
	await Promise.resolve();
}

describe('ChatStream — URL builder throw recovery', () => {
	// Regression: `buildWsUrl` throws synchronously for misconfigured
	// origins (plaintext `http://` to a non-localhost host — a downgrade
	// attack vector). The throw used to propagate out of
	// `fetchTokenAndConnect` as an unhandled rejection: no onDisconnected
	// callback, no reconnect scheduled, the UI stayed wedged on "Online".
	test('connect() resolves cleanly and fires onDisconnected when buildWsUrl throws', async () => {
		const getToken = mock(async () => ({ token: 'tok-1', expiresIn: 300 }));
		const onDisconnected = mock();
		const onConnected = mock();
		const onEvent = mock();

		const stream = new ChatStream({
			getToken,
			onDisconnected,
			onConnected,
			onEvent,
		});

		// Must not reject — the caller uses `void stream.connect()`, so an
		// unhandled rejection here surfaces to the user via Sentry noise and,
		// worse, never triggers onDisconnected.
		await stream.connect();
		await drainMicrotasks();

		expect(onDisconnected).toHaveBeenCalledTimes(1);
		// At least one pending timer = a reconnect attempt was scheduled. We
		// bail after MAX_RECONNECT_ATTEMPTS internally, but the first retry
		// proves the recovery path is armed.
		expect(pendingTimerCount()).toBeGreaterThan(0);
		expect(FakeWebSocket.instances).toHaveLength(0);
	});
});
