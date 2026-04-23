import { z } from 'zod';

/**
 * Chat types — mirrors `raffles-core-backend/src/chat/**` DTOs.
 *
 * Schema-first per .claude/rules/types.md. Every response payload is
 * parsed through these schemas in the corresponding server action so
 * contract drift between frontend and backend surfaces as a Zod error
 * and is captured via `captureContractDrift`.
 *
 * Validation boundary: server-side. Client components receive already
 * parsed and typed values via server actions.
 */

// =============================================================================
// Enumerations
// =============================================================================

/** Conversation kinds — matches backend `ConversationType`. */
export const CONVERSATION_TYPE = {
	DIRECT: 'direct',
	GROUP: 'group',
	RAFFLE_ROOM: 'raffle_room',
	WINNER_CHAT: 'winner_chat',
} as const;

export type ConversationType =
	(typeof CONVERSATION_TYPE)[keyof typeof CONVERSATION_TYPE];

/** Per-conversation member role — determines admin-of-conversation privileges on the backend. */
export const CONVERSATION_MEMBER_ROLE = {
	ADMIN: 'admin',
	MEMBER: 'member',
} as const;

export type ConversationMemberRole =
	(typeof CONVERSATION_MEMBER_ROLE)[keyof typeof CONVERSATION_MEMBER_ROLE];

/**
 * Message kinds.
 *
 * `text | image | file` — user-authored.
 * `system | shipment_update` — server-authored, never sent by the client.
 */
export const MESSAGE_TYPE = {
	TEXT: 'text',
	IMAGE: 'image',
	FILE: 'file',
	SYSTEM: 'system',
	SHIPMENT_UPDATE: 'shipment_update',
} as const;

export type MessageType = (typeof MESSAGE_TYPE)[keyof typeof MESSAGE_TYPE];

/** Message types the client is allowed to send (the rest are server-authored). */
export const CLIENT_SEND_MESSAGE_TYPE = {
	TEXT: 'text',
	IMAGE: 'image',
	FILE: 'file',
} as const;

export type ClientSendMessageType =
	(typeof CLIENT_SEND_MESSAGE_TYPE)[keyof typeof CLIENT_SEND_MESSAGE_TYPE];

// =============================================================================
// Zod Schemas — Entities
// =============================================================================

export const conversationTypeSchema = z.enum([
	CONVERSATION_TYPE.DIRECT,
	CONVERSATION_TYPE.GROUP,
	CONVERSATION_TYPE.RAFFLE_ROOM,
	CONVERSATION_TYPE.WINNER_CHAT,
]);

export const conversationMemberRoleSchema = z.enum([
	CONVERSATION_MEMBER_ROLE.ADMIN,
	CONVERSATION_MEMBER_ROLE.MEMBER,
]);

export const messageTypeSchema = z.enum([
	MESSAGE_TYPE.TEXT,
	MESSAGE_TYPE.IMAGE,
	MESSAGE_TYPE.FILE,
	MESSAGE_TYPE.SYSTEM,
	MESSAGE_TYPE.SHIPMENT_UPDATE,
]);

export const clientSendMessageTypeSchema = z.enum([
	CLIENT_SEND_MESSAGE_TYPE.TEXT,
	CLIENT_SEND_MESSAGE_TYPE.IMAGE,
	CLIENT_SEND_MESSAGE_TYPE.FILE,
]);

/** Structured payload attached to `shipment_update` messages. */
export const shipmentUpdateMetadataSchema = z.object({
	fromStatus: z.string(),
	hostNotes: z.string().nullable(),
	proofUrl: z.string().nullable(),
	toStatus: z.string(),
	winningId: z.string(),
});

export const conversationMemberSchema = z.object({
	/**
	 * Server-enriched display name — same denormalization model as
	 * `winnerDisplayName` on the conversation row. Null when the user was
	 * hard-deleted or predates the backfill. Treat as PII client-side: never
	 * log to Sentry breadcrumbs, never echo to analytics.
	 */
	displayName: z.string().nullable(),
	joinedAt: z.string(),
	role: conversationMemberRoleSchema,
	userId: z.string(),
});

export const conversationLastMessageSchema = z.object({
	body: z.string().nullable(),
	createdAt: z.string(),
	senderId: z.string(),
	type: messageTypeSchema,
});

export const conversationSchema = z.object({
	createdAt: z.string(),
	createdBy: z.string(),
	id: z.string(),
	lastMessage: conversationLastMessageSchema.nullable(),
	maxMembers: z.number(),
	/**
	 * Total active members. Authoritative for participant counts — the header
	 * "X participants" label reads this, NOT `rosterMembers.length`. Raffle-
	 * room conversations may have thousands of participants while the roster
	 * carries only the prioritized slice (see `rosterMembers` below).
	 */
	memberCount: z.number().int().nonnegative(),
	name: z.string().nullable(),
	/** Non-null for `raffle_room` and `winner_chat` conversations. */
	raffleId: z.string().nullable(),
	/**
	 * Server-enriched raffle title. Null when `raffleId` is null OR the raffle
	 * was deleted — UI falls back to the generic type label.
	 */
	raffleTitle: z.string().nullable(),
	/**
	 * Prioritized roster slice — host, winner, admins first, capped server-
	 * side at 50 entries. For direct/group/winner_chat this is effectively the
	 * full membership (those types cap at `maxMembers: 50`). For raffle_room
	 * rooms — which can carry 10k+ participants — this is the top slice the
	 * chat header actually renders; callers that need the full list go
	 * through a separate paginated members endpoint (not shipped yet).
	 *
	 * Do NOT derive participant counts from `rosterMembers.length` — use the
	 * sibling `memberCount` field instead.
	 */
	rosterMembers: z.array(conversationMemberSchema),
	type: conversationTypeSchema,
	updatedAt: z.string(),
	/**
	 * Server-enriched winner display name — non-null only for `winner_chat`
	 * conversations where the user still exists.
	 */
	winnerDisplayName: z.string().nullable(),
	/**
	 * Server-enriched winner email. Exposed only to conversation members (host
	 * / staff / winner) for prize-coordination outreach. Treat as PII client-
	 * side: never log to Sentry breadcrumbs, never echo to analytics. Not
	 * rendered in any component today — kept in the contract so future
	 * mailto: / admin surfaces can consume it without a second round-trip.
	 */
	winnerEmail: z.string().nullable(),
	/** Non-null for `winner_chat` conversations. */
	winnerUserId: z.string().nullable(),
});

export const conversationListResponseSchema = z.object({
	conversations: z.array(conversationSchema),
	hasMore: z.boolean(),
});

export const messageSchema = z.object({
	body: z.string().nullable(),
	conversationId: z.string(),
	createdAt: z.string(),
	deletedAt: z.string().nullable(),
	editedAt: z.string().nullable(),
	id: z.string(),
	mediaType: z.string().nullable(),
	mediaUrl: z.string().nullable(),
	metadata: shipmentUpdateMetadataSchema.nullable(),
	senderId: z.string(),
	type: messageTypeSchema,
});

export const messageListResponseSchema = z.object({
	hasMore: z.boolean(),
	messages: z.array(messageSchema),
});

export const markReadResponseSchema = z.object({
	success: z.boolean(),
});

export const unreadSummaryItemSchema = z.object({
	conversationId: z.string(),
	unreadCount: z.number(),
});

export const unreadSummaryResponseSchema = z.object({
	conversations: z.array(unreadSummaryItemSchema),
	totalUnread: z.number(),
});

export const chatWsTokenResponseSchema = z.object({
	expiresIn: z.number(),
	token: z.string(),
});

export const userPresenceResponseSchema = z.object({
	online: z.boolean(),
	userId: z.string(),
});

export type ShipmentUpdateMetadata = z.infer<
	typeof shipmentUpdateMetadataSchema
>;
export type ConversationMember = z.infer<typeof conversationMemberSchema>;
export type ConversationLastMessage = z.infer<
	typeof conversationLastMessageSchema
>;
export type Conversation = z.infer<typeof conversationSchema>;
export type ConversationListResponse = z.infer<
	typeof conversationListResponseSchema
>;
export type Message = z.infer<typeof messageSchema>;
export type MessageListResponse = z.infer<typeof messageListResponseSchema>;
export type MarkReadResponse = z.infer<typeof markReadResponseSchema>;
export type UnreadSummaryItem = z.infer<typeof unreadSummaryItemSchema>;
export type UnreadSummaryResponse = z.infer<typeof unreadSummaryResponseSchema>;
export type ChatWsTokenResponse = z.infer<typeof chatWsTokenResponseSchema>;
export type UserPresenceResponse = z.infer<typeof userPresenceResponseSchema>;
