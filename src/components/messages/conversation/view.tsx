'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useMemo } from 'react';

import { deriveWinningStatusFromMessages } from '@/lib/utils/raffle/winning-status-from-messages';
import {
	useChatStore,
	useChatTransport,
} from '@/providers/chat-store-provider';
import { useMarkConversationRead } from '@/services/chat/use-mark-conversation-read';
import { useMessages } from '@/services/chat/use-messages';
import {
	CONVERSATION_TYPE,
	type Conversation,
	type Message,
} from '@/types/chat';

import { resolveViewerRole } from '../chat/chat-present';
import { ConversationHeader } from './header';
import { ConversationMessagesList } from './messages-list';
import { MessageComposer } from '../message/composer';
import { useConversationScroll } from './use-scroll';
import { useConversationSend } from './use-send';

interface ConversationViewProps {
	readonly conversation: Conversation;
	readonly viewerId: string;
	/**
	 * Viewer display name — threaded down to the viewer's own message
	 * avatars and the optimistic pending-send bubble. Other members'
	 * names aren't in the chat DTOs yet, so those avatars stay on the
	 * id-hash fallback.
	 */
	readonly viewerName: string;
}

/** Stable references prevent rerender churn when a selector would otherwise yield a new array/object. */
const EMPTY_MESSAGES: readonly Message[] = [];
const EMPTY_TYPING: Readonly<Record<string, true>> = {};

/**
 * Renders a single conversation: header, scrollable message list, composer.
 *
 * Hydrates the store from the REST-paged history so rendering consumes a
 * single source of truth (the store) regardless of whether messages arrived
 * via WS or REST. The composer uses WS by default and falls back to REST
 * when the socket is disconnected — neither path blocks on the other.
 *
 * @param props - Conversation + viewer identity.
 * @returns JSX for the full conversation pane.
 */
export function ConversationView({
	conversation,
	viewerId,
	viewerName,
}: ConversationViewProps) {
	const { id: conversationId } = conversation;

	const transport = useChatTransport();
	const connected = useChatStore(s => s.connected);
	const messages = useChatStore(
		s => s.messagesByConversation[conversationId] ?? EMPTY_MESSAGES,
	);
	const pendingByTempId = useChatStore(s => s.pendingByTempId);
	const typingUserIds = useChatStore(
		s => s.typingByConvoId[conversationId] ?? EMPTY_TYPING,
	);
	const upsertMessage = useChatStore(s => s.upsertMessage);
	const markConversationRead = useChatStore(s => s.markConversationRead);

	const markReadMutation = useMarkConversationRead();

	const {
		data,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isLoading,
		error,
	} = useMessages(conversationId);

	const {
		handleSend,
		handleTyping,
		isSending,
		connected: connectedForPlaceholder,
	} = useConversationSend({ conversationId });

	// Step 1: Seed the store with every message returned by the paginated
	// query. Running as an effect keeps render pure — the store updates
	// trigger the selectors above. Dependency is `data` so each new page
	// merges in.
	useEffect(
		function hydrateStoreFromPages() {
			if (!data) return;
			for (const page of data.pages) {
				for (const message of page.messages) {
					upsertMessage(message);
				}
			}
		},
		[data, upsertMessage],
	);

	// Step 2: Mark the conversation read once we have something to mark.
	// Fires on every `messages` change so new inbound messages clear the
	// badge — the backend is idempotent on the watermark write.
	const latestMessageId = messages.at(-1)?.id;
	useEffect(
		function markReadOnLatest() {
			if (!latestMessageId) return;
			// Step 2a: Local store update — clears the badge immediately.
			markConversationRead(conversationId);
			// Step 2b: WS path — cheaper than REST; server echoes read_receipt.
			if (connected) {
				transport.sendMarkRead(conversationId, latestMessageId);
				return;
			}
			// Step 2c: REST fallback via React Query mutation. Fire-and-forget;
			// failure is non-fatal — the next message re-triggers the watermark.
			// Routing through `markReadMutation` keeps this effect out of
			// `local/no-useeffect-data-fetch` reach (data-fetching.md).
			markReadMutation.mutate({ conversationId, messageId: latestMessageId });
		},
		[
			conversationId,
			latestMessageId,
			connected,
			transport,
			markConversationRead,
			markReadMutation,
		],
	);

	// Winner-chat surface: derive the current winning context (status +
	// winningId) from the conversation's `shipment_update` messages so
	// the intro panel can render the stepper AND wire action CTAs
	// without a second backend round-trip. Gated on conversation type
	// because only `winner_chat` rooms are tied to a `winnings` row;
	// other chat kinds never carry shipment updates.
	const isWinnerChat = conversation.type === CONVERSATION_TYPE.WINNER_CHAT;
	const winningContext = useMemo(
		function computeWinningContext() {
			if (!isWinnerChat) return null;
			return deriveWinningStatusFromMessages(messages);
		},
		[isWinnerChat, messages],
	);

	// Pending sends for THIS conversation only. We filter the global map so
	// a retry in one conversation doesn't render a "sending…" bubble in
	// another. `useMemo` keeps the derived list stable across renders where
	// the map reference is unchanged.
	const pendingForConvo = useMemo(
		() =>
			Object.entries(pendingByTempId)
				.filter(([, entry]) => entry.conversationId === conversationId)
				.map(([tempId, entry]) => ({ tempId, entry })),
		[pendingByTempId, conversationId],
	);

	// `typingUserIds` is a Record keyed by userId; we only care whether
	// anyone OTHER than the viewer is typing. Memoized so the Object.keys
	// allocation + scan only runs when the typing map ref changes (per-
	// conversation selector) and not on every unrelated store tick.
	const hasTypingIndicators = useMemo(
		function computeHasTypingIndicators() {
			for (const userId in typingUserIds) {
				if (userId !== viewerId) return true;
			}
			return false;
		},
		[typingUserIds, viewerId],
	);

	const { scrollContainerRef } = useConversationScroll({
		messagesCount: messages.length,
		pendingCount: pendingForConvo.length,
	});

	const viewerRole = resolveViewerRole(conversation, viewerId);

	if (isLoading) {
		return <ConversationLoading />;
	}

	if (error) {
		return (
			<div className="text-muted-foreground flex h-full items-center justify-center p-8 text-center text-sm">
				Couldn’t load this conversation.
			</div>
		);
	}

	return (
		<section className="flex h-full min-h-0 flex-col">
			<ConversationHeader
				conversation={conversation}
				viewerId={viewerId}
				viewerRole={viewerRole}
				connected={connected}
			/>
			<ConversationMessagesList
				conversation={conversation}
				viewerId={viewerId}
				viewerName={viewerName}
				viewerRole={viewerRole}
				messages={messages}
				pendingForConvo={pendingForConvo}
				hasNextPage={hasNextPage}
				isFetchingNextPage={isFetchingNextPage}
				onFetchNextPage={fetchNextPage}
				winnerIntro={winningContext}
				showTypingIndicator={hasTypingIndicators}
				scrollContainerRef={scrollContainerRef}
			/>
			<MessageComposer
				onSend={handleSend}
				onTyping={handleTyping}
				disabled={isSending}
				placeholder={
					connectedForPlaceholder
						? 'Write a message'
						: 'Reconnecting… (messages send via REST)'
				}
			/>
		</section>
	);
}

/** Centered "loading messages" spinner shown while the initial page is in flight. */
function ConversationLoading() {
	return (
		<div className="text-muted-foreground flex h-full items-center justify-center gap-2 text-sm">
			<Loader2 className="size-4 animate-spin" />
			Loading messages…
		</div>
	);
}
