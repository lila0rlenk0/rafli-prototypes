/**
 * Bidirectional WebSocket client for the chat stream.
 *
 * Protocol (mirrors `raffles-core-backend/src/chat/ws`):
 *   1. Fetch a single-use Redis token via `getChatWsToken` server action.
 *   2. Open `wss://{backend}/api/v1/chat/stream?token={token}` with the
 *      token on the query string — Encore's streaming handshake cannot
 *      read custom headers, so this is the only wire-level auth channel.
 *   3. Client sends: `message`, `typing`, `heartbeat`, `mark_read`.
 *   4. Server sends: `message`, `message_edited`, `message_deleted`,
 *      `typing`, `read_receipt`, `presence`, `ack`, `error`.
 *
 * Security posture:
 *   - Every inbound frame is parsed through `chatServerEventSchema` —
 *     malformed frames are dropped without side effects.
 *   - Token is treated as a one-shot secret: it is never logged, never
 *     cached, and a fresh one is fetched on each reconnect attempt.
 *   - WSS only. Plain `ws://` URLs are rejected — prevents downgrade
 *     attacks on networks that MITM HTTP.
 *   - Reconnect uses exponential backoff + full jitter capped at 30s to
 *     avoid thundering-herd patterns against a recovering backend.
 */

import { clientEnv } from '@/env/client';
import {
	type ChatClientEvent,
	type ChatServerEvent,
	chatServerEventSchema,
} from '@/types/chat';

/** Caller-provided behaviour for the stream lifecycle. */
export interface ChatStreamConfig {
	/** Returns a fresh single-use token — called once per connection attempt. */
	readonly getToken: () => Promise<{
		token: string;
		expiresIn: number;
	} | null>;
	/** Fires for every validated inbound frame. */
	readonly onEvent: (event: ChatServerEvent) => void;
	/** Fires on successful connection (including post-reconnect). */
	readonly onConnected?: () => void;
	/** Fires when the socket closes for any reason. */
	readonly onDisconnected?: () => void;
}

const BASE_RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 30_000;
/** Stop retrying after this many consecutive failures — avoids infinite loops on dead hosts. */
const MAX_RECONNECT_ATTEMPTS = 5;
/** Refresh token at 80% of expiry to avoid edge-case validation races. */
const TOKEN_REFRESH_RATIO = 0.8;
/**
 * Client heartbeat cadence. Matches backend presence TTL hints from
 * `INTEGRATION.md` — send every 30s to keep presence alive across proxies
 * that idle-timeout silent sockets.
 */
const HEARTBEAT_INTERVAL_MS = 30_000;
const WS_CLOSE_NORMAL = 1_000;
const isDev = clientEnv.NODE_ENV === 'development';

/**
 * Computes the `wss://` URL for the chat stream and appends the one-shot
 * token. Rejects plain `ws://` URLs — a downgraded connection would expose
 * the token in cleartext on MITM'd WiFi.
 *
 * Exported for unit testing the protocol allow-list in isolation; production
 * call sites go through {@link ChatStream}.
 *
 * @param baseUrl - Backend origin (typically `clientEnv.NEXT_PUBLIC_BACKEND_URL`).
 * @param token - One-shot chat WS token.
 * @returns `{scheme}://...?token=...` URL safe to hand to `new WebSocket()`.
 * @throws Error if the resulting scheme is not `wss://` and the host is not
 *   a precise `localhost` / `127.0.0.1` dev origin.
 */
export function buildWsUrl(baseUrl: string, token: string): string {
	const base = baseUrl
		.replace('https://', 'wss://')
		.replace('http://', 'ws://');

	// Step 1: wss:// is always allowed — production posture.
	// Step 2: ws://localhost and ws://127.0.0.1 are allowed only when the
	// HOST is literally one of those — i.e. the next char is `:`, `/`, or
	// end-of-string. A naive `startsWith('ws://localhost')` would let a
	// misconfigured env like `http://localhost.attacker.com` downgrade the
	// connection and leak the one-shot token in cleartext on any non-TLS
	// hop. 127.0.0.1 is accepted alongside localhost to sidestep Node's
	// IPv6-first DNS resolution stalls against IPv4-only dev backends.
	const LOCALHOST_DEV_PREFIXES = ['ws://localhost', 'ws://127.0.0.1'] as const;
	const isWss = base.startsWith('wss://');
	const isDevLocalhost = LOCALHOST_DEV_PREFIXES.some(
		prefix =>
			base === prefix ||
			base.startsWith(`${prefix}:`) ||
			base.startsWith(`${prefix}/`),
	);

	if (!isWss && !isDevLocalhost) {
		throw new Error('Chat stream requires wss:// backend URL');
	}

	return `${base}/api/v1/chat/stream?token=${encodeURIComponent(token)}`;
}

/**
 * Adds random jitter (0–100%) to the computed backoff delay so a fleet of
 * tabs reconnecting simultaneously to a recovering backend spread out
 * rather than dog-pile the endpoint.
 */
function withJitter(delayMs: number): number {
	return Math.round(delayMs * (0.5 + Math.random() / 2));
}

export class ChatStream {
	private ws: WebSocket | null = null;
	private reconnectAttempts = 0;
	private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
	private tokenRefreshTimeoutId: ReturnType<typeof setTimeout> | null = null;
	private heartbeatIntervalId: ReturnType<typeof setInterval> | null = null;
	private intentionalClose = false;
	private readonly config: ChatStreamConfig;

	constructor(config: ChatStreamConfig) {
		this.config = config;
	}

	/** Opens the connection. Safe to call on an already-connected stream — no-op. */
	async connect(): Promise<void> {
		if (this.ws) return;
		this.intentionalClose = false;
		this.reconnectAttempts = 0;
		await this.fetchTokenAndConnect();
	}

	/** Closes the connection and cancels every scheduled retry/heartbeat. */
	disconnect(): void {
		this.intentionalClose = true;
		this.clearReconnectTimeout();
		this.clearTokenRefreshTimeout();
		this.clearHeartbeat();
		this.detachAndClose('Client disconnect');
		this.reconnectAttempts = 0;
	}

	/**
	 * Sends a validated outbound frame.
	 *
	 * Returns whether the frame was actually dispatched so the transport
	 * layer can decide between trusting the WS path and falling back to
	 * REST. A naive "always true" would leave optimistic bubbles stuck in
	 * "sending…" when the socket silently dropped the frame (store's
	 * `connected` flag can lag the real readyState by one event loop turn
	 * — especially on `close` firing between the React render that read
	 * `connected=true` and the user pressing Enter).
	 *
	 * @param event - Client → server frame already typed by ChatClientEvent.
	 * @returns `true` if the socket was OPEN and the frame went to the wire;
	 *   `false` when callers should take the REST fallback.
	 */
	send(event: ChatClientEvent): boolean {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
		this.ws.send(JSON.stringify(event));
		return true;
	}

	private async fetchTokenAndConnect(): Promise<void> {
		// Step 1: Ask the caller for a fresh token. null ⇒ unauthenticated or
		// backend unavailable — we back off and try again on the next cycle.
		const tokenData = await this.config.getToken();
		if (!tokenData || this.intentionalClose) return;

		// Step 2: Arm proactive token refresh — single-use tokens rotate per
		// connect, so a refresh effectively means "drop + reconnect".
		this.scheduleTokenRefresh(tokenData.expiresIn);

		// Step 3: Open the socket. `buildWsUrl` throws synchronously on
		// misconfigured env (e.g. plain `http://` to a remote host — a
		// protocol downgrade we refuse). Catching here is defensive: without
		// it, `void stream.connect()` callers would swallow an unhandled
		// rejection and the UI would stay stuck on "Online" with no socket,
		// no `onDisconnected`, and no reconnect armed.
		let url: string;
		try {
			url = buildWsUrl(clientEnv.NEXT_PUBLIC_BACKEND_URL, tokenData.token);
		} catch (error) {
			this.clearTokenRefreshTimeout();
			if (isDev) {
				console.error('[ChatStream] URL build failed:', error);
			}
			this.config.onDisconnected?.();
			this.scheduleReconnect();
			return;
		}
		this.ws = new WebSocket(url);
		this.ws.onopen = this.handleOpen.bind(this);
		this.ws.onmessage = this.handleMessage.bind(this);
		this.ws.onclose = this.handleClose.bind(this);
		this.ws.onerror = this.handleError.bind(this);
	}

	private handleOpen(): void {
		this.reconnectAttempts = 0;
		this.startHeartbeat();
		this.config.onConnected?.();
		if (isDev) console.log('[ChatStream] Connected');
	}

	private handleMessage(event: MessageEvent): void {
		// Step 1: Decode JSON. Any throw here means a non-JSON frame — drop.
		let parsed: unknown;
		try {
			parsed = JSON.parse(String(event.data));
		} catch {
			return;
		}

		// Step 2: Validate against the server event schema. safeParse keeps
		// malformed frames from crashing the handler — unknown event types
		// are silently discarded per the backend's extensibility contract.
		const result = chatServerEventSchema.safeParse(parsed);
		if (!result.success) return;

		this.config.onEvent(result.data);
	}

	private handleClose(event: CloseEvent): void {
		this.ws = null;
		this.clearTokenRefreshTimeout();
		this.clearHeartbeat();
		this.config.onDisconnected?.();

		if (this.intentionalClose) return;

		// Proactive token refresh closes with our `Token refresh` reason — it
		// handles reconnecting itself, so we must not also schedule another attempt.
		const isTokenRefresh =
			event.code === WS_CLOSE_NORMAL && event.reason === 'Token refresh';
		if (isTokenRefresh) return;

		if (isDev) {
			console.warn('[ChatStream] Closed:', event.code, event.reason);
		}
		this.scheduleReconnect();
	}

	private handleError(): void {
		// `onerror` carries no details per WS spec (security). The subsequent
		// `onclose` has the actual code/reason — log only in dev to avoid noise.
		if (isDev) {
			console.warn('[ChatStream] Connection error (close event follows)');
		}
	}

	private scheduleReconnect(): void {
		if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
			if (isDev) {
				console.warn(
					`[ChatStream] Reconnect failed after ${MAX_RECONNECT_ATTEMPTS} attempts — giving up`,
				);
			}
			return;
		}

		// Exponential backoff with jitter — prevents thundering-herd on recovery.
		const rawDelay = Math.min(
			BASE_RECONNECT_DELAY_MS * 2 ** this.reconnectAttempts,
			MAX_RECONNECT_DELAY_MS,
		);
		const delay = withJitter(rawDelay);
		this.reconnectAttempts++;

		if (isDev) {
			console.log(
				`[ChatStream] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`,
			);
		}

		this.reconnectTimeoutId = setTimeout(() => {
			void this.fetchTokenAndConnect();
		}, delay);
	}

	private scheduleTokenRefresh(expiresIn: number): void {
		this.clearTokenRefreshTimeout();
		const delay = expiresIn * TOKEN_REFRESH_RATIO * 1_000;
		this.tokenRefreshTimeoutId = setTimeout(() => {
			void this.refreshToken();
		}, delay);
	}

	private async refreshToken(): Promise<void> {
		if (this.intentionalClose) return;
		// Step 1: Detach handlers before closing so the pending close event
		// cannot race with the fresh socket — `onclose` fires asynchronously
		// and `this.ws` may already point to the new connection by the time
		// it dispatches, which would otherwise null the new ref in handleClose.
		this.detachAndClose('Token refresh');
		// Step 2: Reset attempts — proactive refresh is not an error
		// recovery path, so the backoff window should start fresh if the
		// new handshake fails downstream.
		this.reconnectAttempts = 0;
		await this.fetchTokenAndConnect();

		// Step 3: Recovery guard for a token-service outage during refresh.
		// `fetchTokenAndConnect` returns without opening a socket when
		// `getToken` resolves to null. Without this branch the stream was
		// permanently dead: no `onclose` fires (we pre-detached the handler
		// in Step 1) and no reconnect gets scheduled, so the store still
		// believed it was `connected` even though the socket was gone.
		if (!this.ws && !this.intentionalClose) {
			this.config.onDisconnected?.();
			this.scheduleReconnect();
		}
	}

	/**
	 * Detaches every event handler from the current socket and closes it.
	 * Callers that want close-side-effects (onDisconnected, reconnect
	 * scheduling) should rely on the socket's natural lifecycle instead —
	 * this helper is for paths that reopen immediately and don't want the
	 * lagging close event of the prior socket to clobber the new one.
	 */
	private detachAndClose(reason: string): void {
		const ws = this.ws;
		if (!ws) return;
		this.ws = null;
		ws.onopen = null;
		ws.onmessage = null;
		ws.onclose = null;
		ws.onerror = null;
		ws.close(WS_CLOSE_NORMAL, reason);
	}

	private startHeartbeat(): void {
		this.clearHeartbeat();
		this.heartbeatIntervalId = setInterval(() => {
			this.send({ type: 'heartbeat' });
		}, HEARTBEAT_INTERVAL_MS);
	}

	private clearHeartbeat(): void {
		if (this.heartbeatIntervalId) {
			clearInterval(this.heartbeatIntervalId);
			this.heartbeatIntervalId = null;
		}
	}

	private clearReconnectTimeout(): void {
		if (this.reconnectTimeoutId) {
			clearTimeout(this.reconnectTimeoutId);
			this.reconnectTimeoutId = null;
		}
	}

	private clearTokenRefreshTimeout(): void {
		if (this.tokenRefreshTimeoutId) {
			clearTimeout(this.tokenRefreshTimeoutId);
			this.tokenRefreshTimeoutId = null;
		}
	}
}
