import type { ClientErrorCode } from './client-errors';
import type { CommonErrorCode } from './common-errors';

/**
 * Chat error codes — mirror the backend `chat:*` URNs emitted by
 * `raffles-core-backend/src/chat/**` (conversations, messages, rooms,
 * attachments, WebSocket token service).
 *
 * Frontend-only codes live alongside backend codes here for ergonomic
 * import — the `VALIDATION_FAILED` value is surfaced when a response
 * fails Zod parsing (contract drift) and mirrors the pattern used by
 * `NOTIFICATION_ERROR_CODES.VALIDATION_FAILED`.
 */
export const CHAT_ERROR_CODES = {
	// Conversation-level business rules
	CONVERSATION_NOT_FOUND: 'chat:conversation:not-found',
	CONVERSATION_NOT_MEMBER: 'chat:conversation:not-member',
	CONVERSATION_PERMISSION_DENIED: 'chat:conversation:permission-denied',
	CONVERSATION_INVALID_MEMBER_COUNT: 'chat:conversation:invalid-member-count',
	CONVERSATION_INVALID_MEMBER: 'chat:conversation:invalid-member',
	CONVERSATION_DAILY_LIMIT_REACHED: 'chat:conversation:daily-limit-reached',
	CONVERSATION_MAX_MEMBERS: 'chat:conversation:max-members',
	CONVERSATION_ALREADY_MEMBER: 'chat:conversation:already-member',
	CONVERSATION_MAX_MEMBERS_BELOW_CURRENT:
		'chat:conversation:max-members-below-current',

	// Message-level business rules
	MESSAGE_NOT_FOUND: 'chat:message:not-found',
	MESSAGE_DELETED: 'chat:message:deleted',
	MESSAGE_PERMISSION_DENIED: 'chat:message:permission-denied',
	MESSAGE_EDIT_WINDOW_EXPIRED: 'chat:message:edit-window-expired',
	MESSAGE_INVALID_BODY: 'chat:message:invalid-body',
	MESSAGE_INVALID_TYPE: 'chat:message:invalid-type',
	MESSAGE_INVALID_ATTACHMENT: 'chat:message:invalid-attachment',

	// Raffle-room specific
	ROOM_NOT_FOUND: 'chat:room:not-found',
	ROOM_READ_ONLY: 'chat:room:read-only',
	ROOM_FULL: 'chat:room:full',

	// WebSocket token service
	WS_INVALID_TOKEN: 'chat:ws:invalid-token',
	WS_MAX_CONNECTIONS: 'chat:ws:max-connections',
	WS_TOKEN_SERVICE_UNAVAILABLE: 'chat:ws:token-service-unavailable',

	// Attachment registry
	ATTACHMENT_PENDING_LIMIT_REACHED: 'chat:attachment:pending-limit-reached',

	// User lookup
	USER_NOT_FOUND: 'chat:user:not-found',

	// Frontend-only — Zod contract drift on chat responses
	VALIDATION_FAILED: 'chat:validation:failed',
} as const;

export type ChatErrorCode =
	| (typeof CHAT_ERROR_CODES)[keyof typeof CHAT_ERROR_CODES]
	| ClientErrorCode
	| CommonErrorCode;
