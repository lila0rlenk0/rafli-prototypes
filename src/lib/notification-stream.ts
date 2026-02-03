/**
 * WebSocket client for real-time notification streaming
 *
 * Handles connection and reconnection with exponential backoff.
 */

import { clientEnv } from '@/env/client';
import { notificationStreamEventSchema } from '@/types/notification';

/**
 * Configuration for notification stream
 */
export interface NotificationStreamConfig {
	/** Called when server signals new notification available */
	onNewNotification: () => void;
}

const BASE_RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 30_000;
const WS_CLOSE_NORMAL = 1_000;

/**
 * Builds WebSocket URL from backend URL
 *
 * @param token - WebSocket auth token
 * @returns WebSocket URL with token query param
 */
function buildWsUrl(token: string): string {
	const baseUrl = clientEnv.NEXT_PUBLIC_BACKEND_URL
		.replace('https://', 'wss://')
		.replace('http://', 'ws://');

	return `${baseUrl}/api/v1/me/notifications/stream?token=${encodeURIComponent(token)}`;
}

/**
 * NotificationStream class
 *
 * Manages WebSocket connection for real-time notification events.
 * Automatically reconnects with exponential backoff on disconnection.
 */
export class NotificationStream {
	private ws: WebSocket | null = null;
	private reconnectAttempts = 0;
	private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
	private token: string | null = null;
	private intentionalClose = false;
	private config: NotificationStreamConfig;

	constructor(config: NotificationStreamConfig) {
		this.config = config;
	}

	/**
	 * Connects to notification stream
	 *
	 * @param token - WebSocket auth token from /me/ws-token
	 */
	connect(token: string): void {
		this.token = token;
		this.intentionalClose = false;
		this.createConnection();
	}

	/**
	 * Disconnects from notification stream
	 *
	 * Performs clean close, prevents reconnection attempts.
	 */
	disconnect(): void {
		this.intentionalClose = true;
		this.clearReconnectTimeout();

		if (this.ws) {
			this.ws.close(WS_CLOSE_NORMAL, 'Client disconnect');
			this.ws = null;
		}

		this.token = null;
		this.reconnectAttempts = 0;
	}

	/**
	 * Creates WebSocket connection
	 */
	private createConnection(): void {
		if (!this.token) return;

		const url = buildWsUrl(this.token);
		this.ws = new WebSocket(url);

		this.ws.onopen = this.handleOpen.bind(this);
		this.ws.onmessage = this.handleMessage.bind(this);
		this.ws.onclose = this.handleClose.bind(this);
		this.ws.onerror = this.handleError.bind(this);
	}

	/**
	 * Handles successful connection
	 */
	private handleOpen(): void {
		this.reconnectAttempts = 0;
		if (process.env.NODE_ENV === 'development') {
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
	 */
	private handleClose(event: CloseEvent): void {
		this.ws = null;

		if (process.env.NODE_ENV === 'development') {
			console.warn('[NotificationStream] Closed:', event.code, event.reason);
		}

		// Don't reconnect if intentionally closed
		if (this.intentionalClose) return;

		this.scheduleReconnect();
	}

	/**
	 * Handles connection error
	 *
	 * Connection will close after error, handleClose will trigger reconnect.
	 */
	private handleError(): void {
		if (process.env.NODE_ENV === 'development') {
			console.error('[NotificationStream] Error');
		}
	}

	/**
	 * Schedules reconnection with exponential backoff (capped at 30s)
	 */
	private scheduleReconnect(): void {
		const delay = Math.min(
			BASE_RECONNECT_DELAY_MS * Math.pow(2, this.reconnectAttempts),
			MAX_RECONNECT_DELAY_MS,
		);
		this.reconnectAttempts++;

		if (process.env.NODE_ENV === 'development') {
			console.log(`[NotificationStream] Reconnecting in ${delay}ms...`);
		}

		this.reconnectTimeoutId = setTimeout(() => {
			this.createConnection();
		}, delay);
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
}
