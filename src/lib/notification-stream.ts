/**
 * WebSocket client for real-time notification streaming
 *
 * Handles connection and reconnection with exponential backoff.
 * Gives up after MAX_RECONNECT_ATTEMPTS to avoid infinite retry loops
 * (e.g. when WS endpoint is unreachable on staging/remote backends).
 */

import { clientEnv } from '@/env/client';
import { notificationStreamEventSchema } from '@/types/notification';

/**
 * Configuration for notification stream
 */
export interface NotificationStreamConfig {
	/** Called when server signals new notification available */
	onNewNotification: () => void;
	/** Called to fetch fresh WS token (on connect and reconnect) */
	getToken: () => Promise<{ token: string; expiresIn: number } | null>;
	/** Called when stream recovers from poll fallback back to WebSocket */
	onReconnected?: () => void;
}

const BASE_RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 30_000;
/** Stop retrying after this many consecutive failures — falls back to slow polling */
const MAX_RECONNECT_ATTEMPTS = 5;
/** Polling interval when WS is dead — checks for new notifications and probes WS recovery */
const POLL_FALLBACK_INTERVAL_MS = 60_000;
const WS_CLOSE_NORMAL = 1_000;
/** Refresh token at 80% of expiry to avoid edge cases */
const TOKEN_REFRESH_RATIO = 0.8;
const isDev = clientEnv.NODE_ENV === 'development';

/**
 * Builds WebSocket URL from backend URL
 *
 * @param token - WebSocket auth token
 * @returns WebSocket URL with token query param
 */
function buildWsUrl(token: string): string {
	const baseUrl = clientEnv.NEXT_PUBLIC_BACKEND_URL.replace(
		'https://',
		'wss://',
	).replace('http://', 'ws://');

	return `${baseUrl}/api/v1/me/notifications/stream?token=${encodeURIComponent(token)}`;
}

/**
 * NotificationStream class
 *
 * Manages WebSocket connection for real-time notification events.
 * Automatically reconnects with exponential backoff on disconnection.
 * Handles token refresh before expiration.
 */
export class NotificationStream {
	private ws: WebSocket | null = null;
	private reconnectAttempts = 0;
	private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
	private tokenRefreshTimeoutId: ReturnType<typeof setTimeout> | null = null;
	private pollIntervalId: ReturnType<typeof setInterval> | null = null;
	private intentionalClose = false;
	private config: NotificationStreamConfig;

	constructor(config: NotificationStreamConfig) {
		this.config = config;
	}

	/**
	 * Connects to notification stream
	 *
	 * Fetches token via config callback and establishes connection.
	 */
	async connect(): Promise<void> {
		this.intentionalClose = false;
		this.reconnectAttempts = 0;
		await this.fetchTokenAndConnect();
	}

	/**
	 * Disconnects from notification stream
	 *
	 * Performs clean close, prevents reconnection attempts.
	 */
	disconnect(): void {
		this.intentionalClose = true;
		this.clearReconnectTimeout();
		this.clearTokenRefreshTimeout();
		this.clearPollFallback();

		if (this.ws) {
			this.ws.close(WS_CLOSE_NORMAL, 'Client disconnect');
			this.ws = null;
		}

		this.reconnectAttempts = 0;
	}

	/**
	 * Fetches fresh token and creates WebSocket connection
	 */
	private async fetchTokenAndConnect(): Promise<void> {
		const tokenData = await this.config.getToken();

		if (!tokenData || this.intentionalClose) return;

		this.scheduleTokenRefresh(tokenData.expiresIn);

		const url = buildWsUrl(tokenData.token);
		this.ws = new WebSocket(url);

		this.ws.onopen = this.handleOpen.bind(this);
		this.ws.onmessage = this.handleMessage.bind(this);
		this.ws.onclose = this.handleClose.bind(this);
		this.ws.onerror = this.handleError.bind(this);
	}

	/**
	 * Handles successful connection.
	 * If recovering from poll fallback, clears the interval and notifies
	 * so the provider can catch up on missed notifications.
	 */
	private handleOpen(): void {
		const wasPolling = this.pollIntervalId !== null;
		this.reconnectAttempts = 0;
		this.clearPollFallback();

		if (wasPolling) {
			this.config.onReconnected?.();
		}

		if (isDev) {
			console.log('[NotificationStream] Connected');
		}
	}

	/**
	 * Handles incoming message
	 *
	 * @param event - WebSocket message event
	 */
	private handleMessage(event: MessageEvent): void {
		try {
			const data: unknown = JSON.parse(event.data as string);
			const parsed = notificationStreamEventSchema.safeParse(data);

			if (parsed.success && parsed.data.event === 'new_notification') {
				this.config.onNewNotification();
			}
		} catch {
			// Invalid message format, ignore
		}
	}

	/**
	 * Handles connection close
	 *
	 * Triggers reconnection unless intentionally closed, token-refreshing,
	 * or max attempts reached.
	 */
	private handleClose(event: CloseEvent): void {
		this.ws = null;
		this.clearTokenRefreshTimeout();

		// Don't reconnect if intentionally closed
		if (this.intentionalClose) return;

		// Token refresh handles its own reconnection
		const isTokenRefresh =
			event.code === WS_CLOSE_NORMAL && event.reason === 'Token refresh';
		if (isTokenRefresh) return;

		if (isDev) {
			console.warn('[NotificationStream] Closed:', event.code, event.reason);
		}

		this.scheduleReconnect();
	}

	/**
	 * Handles connection error
	 *
	 * WebSocket onerror provides no detail per spec (security).
	 * The subsequent onclose event carries the actual close code/reason.
	 * Logged as warn since this is a transient network condition, not a bug.
	 */
	private handleError(): void {
		if (isDev) {
			console.warn(
				'[NotificationStream] Connection error (close event follows with details)',
			);
		}
	}

	/**
	 * Schedules reconnection with exponential backoff (capped at 30s)
	 *
	 * Fetches fresh token on each reconnect attempt.
	 * Gives up after MAX_RECONNECT_ATTEMPTS to avoid infinite retry loops.
	 */
	private scheduleReconnect(): void {
		if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
			if (isDev) {
				console.warn(
					`[NotificationStream] WS failed ${MAX_RECONNECT_ATTEMPTS} times — falling back to ${POLL_FALLBACK_INTERVAL_MS / 1_000}s polling`,
				);
			}
			this.startPollFallback();
			return;
		}

		const delay = Math.min(
			BASE_RECONNECT_DELAY_MS * Math.pow(2, this.reconnectAttempts),
			MAX_RECONNECT_DELAY_MS,
		);
		this.reconnectAttempts++;

		if (isDev) {
			console.log(
				`[NotificationStream] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`,
			);
		}

		this.reconnectTimeoutId = setTimeout(() => {
			this.fetchTokenAndConnect();
		}, delay);
	}

	/**
	 * Schedules token refresh before expiration
	 *
	 * @param expiresIn - Token TTL in seconds
	 */
	private scheduleTokenRefresh(expiresIn: number): void {
		this.clearTokenRefreshTimeout();

		const refreshDelay = expiresIn * TOKEN_REFRESH_RATIO * 1_000;

		if (isDev) {
			console.log(
				`[NotificationStream] Token refresh scheduled in ${Math.round(refreshDelay / 1_000)}s`,
			);
		}

		this.tokenRefreshTimeoutId = setTimeout(() => {
			this.refreshToken();
		}, refreshDelay);
	}

	/**
	 * Refreshes token and reconnects
	 */
	private async refreshToken(): Promise<void> {
		if (this.intentionalClose) return;

		if (isDev) {
			console.log('[NotificationStream] Refreshing token...');
		}

		// Close current connection, fetchTokenAndConnect will establish new one
		if (this.ws) {
			this.ws.close(WS_CLOSE_NORMAL, 'Token refresh');
			this.ws = null;
		}

		// Reset attempts since this is proactive refresh, not error recovery
		this.reconnectAttempts = 0;
		await this.fetchTokenAndConnect();
	}

	/**
	 * Starts slow-poll fallback after WS reconnect attempts are exhausted.
	 * Each tick: fires onNewNotification (so the provider refetches the list),
	 * then probes WS recovery by attempting a fresh connection.
	 */
	private startPollFallback(): void {
		if (this.pollIntervalId) return;

		this.pollIntervalId = setInterval(() => {
			// Trigger a data refresh even without WS
			this.config.onNewNotification();

			// Cancel any pending reconnect from a previous failed probe before starting a new one
			this.clearReconnectTimeout();
			// Probe WS recovery — reset attempts and try once
			this.reconnectAttempts = 0;
			this.fetchTokenAndConnect();
		}, POLL_FALLBACK_INTERVAL_MS);
	}

	/**
	 * Clears poll fallback interval
	 */
	private clearPollFallback(): void {
		if (this.pollIntervalId) {
			clearInterval(this.pollIntervalId);
			this.pollIntervalId = null;
		}
	}

	/**
	 * Clears pending reconnect timeout
	 */
	private clearReconnectTimeout(): void {
		if (this.reconnectTimeoutId) {
			clearTimeout(this.reconnectTimeoutId);
			this.reconnectTimeoutId = null;
		}
	}

	/**
	 * Clears pending token refresh timeout
	 */
	private clearTokenRefreshTimeout(): void {
		if (this.tokenRefreshTimeoutId) {
			clearTimeout(this.tokenRefreshTimeoutId);
			this.tokenRefreshTimeoutId = null;
		}
	}
}
