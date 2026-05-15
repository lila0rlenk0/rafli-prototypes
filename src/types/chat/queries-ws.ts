import { z } from 'zod';

import { cursorPaginationQuerySchema } from '../pagination';

import {
	clientSendMessageTypeSchema,
	messageTypeSchema,
	shipmentUpdateMetadataSchema,
	type ClientSendMessageType,
} from './entities';

/**
 * Body for `POST /chat/conversations/:id/messages`. Limits mirror backend
 * `sendMessageDtoSchema` (min 1, max 4000) — kept in lockstep so rejections
 * happen on the caller's side before the network round-trip.
 */
export const sendMessageInputSchema = z.object({
	body: z.string().min(1).max(4_000),
	msgType: clientSendMessageTypeSchema.optional(),
	attachmentId: z.string().optional(),
});

export const editMessageInputSchema = z.object({
	body: z.string().min(1).max(4_000),
});

export const markReadInputSchema = z.object({
	messageId: z.string(),
});

/** Aliased shared cursor pagination — same shape as `cursorPaginationQuerySchema`. */
export const chatPaginationQuerySchema = cursorPaginationQuerySchema;

/**
 * Inbox filter chip — the UI only renders `all` and `unread` even though
 * the BE supports `winners` / `raffles` too. Those scopes were removed
 * from the sidebar long ago; the FE union stays narrow on purpose so the
 * `chatListFilterLabel` switch can keep its exhaustive `never` check and
 * a reintroduced filter forces an explicit UI decision. The list /
 * counts endpoints silently ignore filter values the FE never sends.
 */
export const CONVERSATION_FILTER_VALUES = ['all', 'unread'] as const;
export type ConversationFilter = (typeof CONVERSATION_FILTER_VALUES)[number];

/** Inbox sort mode — backend values in `CONVERSATION_SORT_VALUES`. */
export const CONVERSATION_SORT_VALUES = [
	'recent',
	'oldest',
	'unread_first',
] as const;
export type ConversationSort = (typeof CONVERSATION_SORT_VALUES)[number];

/**
 * Query shape for `GET /chat/conversations`. Adds server-side filter/search/
 * sort on top of the cursor+limit base — the client passes these through the
 * server action untouched (backend is authoritative).
 */
export const conversationsListQuerySchema = chatPaginationQuerySchema.extend({
	q: z.string().max(120).optional(),
	filter: z.enum(CONVERSATION_FILTER_VALUES).optional(),
	sort: z.enum(CONVERSATION_SORT_VALUES).optional(),
});

/**
 * Response shape for `GET /chat/conversations/counts` — filter-chip badges.
 *
 * The BE response carries `winners` / `raffles` counts too; Zod strips them
 * because the UI doesn't render those chips (see
 * `CONVERSATION_FILTER_VALUES`). Adding them back here without a chip to
 * surface them would be dead schema surface.
 */
export const conversationCountsResponseSchema = z.object({
	all: z.number().int().nonnegative(),
	unread: z.number().int().nonnegative(),
});

export const conversationCountsQuerySchema = z.object({
	q: z.string().max(120).optional(),
});

/** Embedded message shape sent over WS — mirrors backend `WsMessageDto`. */
export const wsMessagePayloadSchema = z.object({
	body: z.string().nullable(),
	conversationId: z.string(),
	createdAt: z.string(),
	id: z.string(),
	mediaType: z.string().nullable(),
	mediaUrl: z.string().nullable(),
	metadata: shipmentUpdateMetadataSchema.nullable(),
	senderId: z.string(),
	type: messageTypeSchema,
});

/**
 * Server → Client frame.
 *
 * Flattened discriminated union on `type` — matches Encore's wire format
 * where every field below sender is optional because each event type only
 * populates its own subset. We validate at runtime so a malformed frame
 * from a compromised proxy is dropped before reaching the store.
 */
export const chatServerEventSchema = z.object({
	type: z.enum([
		'ack',
		'error',
		'message',
		'message_deleted',
		'message_edited',
		'presence',
		'read_receipt',
		'typing',
	]),
	body: z.string().optional(),
	code: z.string().optional(),
	conversationId: z.string().optional(),
	lastReadMessageId: z.string().optional(),
	message: wsMessagePayloadSchema.optional(),
	messageId: z.string().optional(),
	online: z.boolean().optional(),
	tempId: z.string().optional(),
	userId: z.string().optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageInputSchema>;
export type EditMessageInput = z.infer<typeof editMessageInputSchema>;
export type MarkReadInput = z.infer<typeof markReadInputSchema>;
export type ChatPaginationQuery = z.infer<typeof chatPaginationQuerySchema>;
export type ConversationsListQuery = z.infer<
	typeof conversationsListQuerySchema
>;
export type ConversationCountsQuery = z.infer<
	typeof conversationCountsQuerySchema
>;
export type ConversationCountsResponse = z.infer<
	typeof conversationCountsResponseSchema
>;

export type WsMessagePayload = z.infer<typeof wsMessagePayloadSchema>;
export type ChatServerEvent = z.infer<typeof chatServerEventSchema>;

/** Client → server WS frame. Flat to match Encore's wire contract. */
export type ChatClientEvent =
	| {
			type: 'message';
			conversationId: string;
			body: string;
			tempId: string;
			msgType?: ClientSendMessageType;
			attachmentId?: string;
	  }
	| { type: 'typing'; conversationId: string }
	| { type: 'heartbeat' }
	| { type: 'mark_read'; conversationId: string; messageId: string };
