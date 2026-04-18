'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { deriveWinningStatusFromMessages } from '@/lib/utils/winning-status-from-messages';
import {
	useChatStore,
	useChatTransport,
} from '@/providers/chat-store-provider';
import { markRead } from '@/services/chat/mark-read';
import { useMessages } from '@/services/chat/use-messages';
import { useSendMessage } from '@/services/chat/use-send-message';
import type { PendingSend } from '@/store/chat-store';
import {
	CONVERSATION_TYPE,
	type Conversation,
	type Message,
} from '@/types/chat';

import { AvatarCircle } from './avatar-circle';
import {
	formatConversationSubtitle,
	formatConversationTitle,
	resolveViewerRole,
	shouldAutoScrollToBottom,
	VIEWER_ROLE,
} from './chat-utils';
import { MessageBubble } from './message-bubble';
import { MessageComposer } from './message-composer';
import { ParticipantRoster } from './participant-roster';
import { RoleBadge } from './role-badge';
import { StatusPill } from './status-pill';
import { TypingIndicator } from './typing-indicator';
import { WinnerChatIntroPanel } from './winner-chat-intro-panel';

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

/**
 * Renders a single conversation: header, scrollable message list, composer.
 *
 * Hydrates the store from the REST-paged history so rendering consumes a
 * single source of truth (the store) regardless of whether messages arrived
 * via WS or REST. The composer uses WS by default and falls back to REST
 * when the socket is disconnected — neither path blocks on the other.
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
	const addPending = useChatStore(s => s.addPending);
	const failPending = useChatStore(s => s.failPending);
	const markConversationRead = useChatStore(s => s.markConversationRead);

	const sendMessageMutation = useSendMessage();

	const {
		data,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isLoading,
		error,
	} = useMessages(conversationId);

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
	// We fire on every `messages` change so that new inbound messages also
	// clear the badge — the backend is idempotent on the watermark write.
	// mount: fired whenever conversation or latest id changes.
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
			// Step 2c: REST fallback. Fire-and-forget — a failure here is
			// non-fatal and the next message will re-trigger the watermark.
			void markRead(conversationId, latestMessageId);
		},
		[
			conversationId,
			latestMessageId,
			connected,
			transport,
			markConversationRead,
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

	// Step 3: Auto-scroll to the bottom on new-message arrival. The first
	// hydrate always scrolls so the user lands on the newest bubble
	// (messages are stored ascending by id, so scrollTop=0 means OLDEST).
	// Subsequent arrivals only scroll when the user is already near the
	// bottom, so they don't get yanked away while reading history.
	//
	// Refs are reset via remount: `chat-inbox.tsx` keys this component on
	// `conversation.id`, so navigating to a different conversation gives us
	// a fresh `firstScrollDoneRef = false` without an extra reset effect.
	const scrollContainerRef = useRef<HTMLDivElement | null>(null);
	const firstScrollDoneRef = useRef(false);
	useEffect(
		function scrollToBottomOnNew() {
			const el = scrollContainerRef.current;
			if (!el) return;
			const distanceFromBottom =
				el.scrollHeight - el.scrollTop - el.clientHeight;
			const hasAnything = messages.length + pendingForConvo.length > 0;
			const shouldScroll = shouldAutoScrollToBottom({
				firstScrollDone: firstScrollDoneRef.current,
				distanceFromBottom,
				hasMessages: hasAnything,
			});
			if (!shouldScroll) return;
			el.scrollTop = el.scrollHeight;
			firstScrollDoneRef.current = true;
		},
		[messages.length, pendingForConvo.length],
	);

	const viewerRole = resolveViewerRole(conversation, viewerId);

	async function handleSend(body: string) {
		// Step 1: Optimistic — generate tempId, register pending bubble.
		const tempId = crypto.randomUUID();
		addPending(tempId, conversationId, body);

		// Step 2: Prefer WS transport — cheaper and faster than REST.
		if (connected && transport.sendMessage(conversationId, body, tempId)) {
			return;
		}

		// Step 3: REST fallback. On success the server echoes the message
		// via WS (if connected) or React Query invalidation; the store
		// resolves the tempId either way.
		try {
			const message = await sendMessageMutation.mutateAsync({
				conversationId,
				input: { body },
			});
			upsertMessage(message, tempId);
		} catch (err) {
			const code =
				err && typeof err === 'object' && 'code' in err
					? String((err as { code: unknown }).code)
					: 'unknown_error';
			failPending(tempId, code);
			toast.error('Couldn’t send message — tap failed message to retry.');
		}
	}

	function handleTyping() {
		// Cheap fire-and-forget; composer is already throttled.
		if (connected) transport.sendTyping(conversationId);
	}

	// `typingUserIds` is a Record keyed by userId; we only care whether
	// anyone OTHER than the viewer is typing. Memoized so the
	// Object.keys allocation + scan only runs when the typing map ref
	// changes (per-conversation selector, see `typingByConvoId` above),
	// not on every unrelated store tick.
	const hasTypingIndicators = useMemo(
		function computeHasTypingIndicators() {
			for (const userId in typingUserIds) {
				if (userId !== viewerId) return true;
			}
			return false;
		},
		[typingUserIds, viewerId],
	);

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
			{/* Header — title + participant roster chips */}
			<header className="flex items-start justify-between gap-2 border-b px-4 py-3">
				{/* `flex-1 min-w-0` on the title column — without `flex-1` the
				    column sizes to its content and `truncate` on the h2 never
				    triggers, so long raffle titles push the role/status pills
				    off-screen on narrow viewports. */}
				<div className="flex min-w-0 flex-1 flex-col gap-1">
					<h2 className="truncate text-sm font-semibold">
						{formatConversationTitle(conversation)}
					</h2>
					{/* Winner pin: every chat in this product is a winner_chat of
					    (winner + host + platform admins), so surfacing the winner
					    as a dedicated subtitle above the roster anchors the
					    "whose prize is this?" question without scanning chips.
					    `formatConversationSubtitle` returns null for non-winner
					    types, so this line self-hides if the contract ever
					    broadens to other chat kinds. */}
					<WinnerSubtitle conversation={conversation} />
					{/* Roster names each other participant with a role chip —
					    replaces the prior "X participants" count. Winner is
					    pinned as the subtitle above; the roster fills in host +
					    platform admins so the viewer can see who's in-room. */}
					<ParticipantRoster conversation={conversation} viewerId={viewerId} />
				</div>
				<div className="flex shrink-0 items-center gap-2">
					{viewerRole ? <RoleBadge role={viewerRole} /> : null}
					<StatusPill online={connected} />
				</div>
			</header>

			{/* Scrollable message list */}
			<div
				ref={scrollContainerRef}
				className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
				role="log"
				aria-live="polite"
			>
				{hasNextPage ? (
					<div className="flex justify-center">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => fetchNextPage()}
							disabled={isFetchingNextPage}
						>
							{isFetchingNextPage ? (
								<>
									<Loader2 className="mr-2 size-3 animate-spin" /> Loading older
								</>
							) : (
								'Load older messages'
							)}
						</Button>
					</div>
				) : null}

				{isWinnerChat && winningContext && conversation.raffleId !== null ? (
					<WinnerChatIntroPanel
						currentStatus={winningContext.status}
						raffleId={conversation.raffleId}
						winningId={winningContext.winningId}
						viewerRole={viewerRole}
					/>
				) : null}

				{messages.length === 0 && pendingForConvo.length === 0 ? (
					<EmptyConversation />
				) : (
					<>
						{messages.map(message => (
							<MessageBubble
								key={message.id}
								message={message}
								isOwn={message.senderId === viewerId}
								senderRole={resolveViewerRole(conversation, message.senderId)}
								viewerName={viewerName}
							/>
						))}
						{pendingForConvo.map(({ tempId, entry }) => (
							<PendingBubble
								key={tempId}
								entry={entry}
								viewerName={viewerName}
							/>
						))}
					</>
				)}

				{hasTypingIndicators ? (
					<div className="flex justify-start">
						<TypingIndicator />
					</div>
				) : null}
			</div>

			{/* Composer */}
			<MessageComposer
				onSend={handleSend}
				onTyping={handleTyping}
				disabled={sendMessageMutation.isPending}
				placeholder={
					connected
						? 'Write a message'
						: 'Reconnecting… (messages send via REST)'
				}
			/>
		</section>
	);
}

/** Stable references prevent rerender churn when a selector would otherwise yield a new array/object. */
const EMPTY_MESSAGES: readonly Message[] = [];
const EMPTY_TYPING: Readonly<Record<string, true>> = {};

/**
 * Optimistic bubble for a send that hasn't been confirmed yet. Rendered
 * from `pendingByTempId` so the user sees their message the instant they
 * press Enter, before the WS `ack` or REST response lands. Always the
 * viewer's own message — sender metadata is the current user.
 */
function PendingBubble({
	entry,
	viewerName,
}: {
	readonly entry: PendingSend;
	readonly viewerName: string;
}) {
	const failed = entry.status === 'failed';
	return (
		<div className="flex flex-row-reverse items-start gap-2">
			<AvatarCircle
				displayName={viewerName}
				role={VIEWER_ROLE.MEMBER}
				size="sm"
			/>
			<div className="flex max-w-[85%] flex-col items-end gap-1">
				<div
					className={cn(
						'bg-primary text-primary-foreground w-fit rounded-2xl px-3 py-2 text-sm',
						failed && 'opacity-70',
					)}
				>
					{entry.body}
				</div>
				<div className="text-muted-foreground flex items-center gap-2 text-[11px]">
					{failed ? (
						<span className="text-destructive" role="alert">
							failed — refresh to retry
						</span>
					) : (
						<span className="italic">sending…</span>
					)}
				</div>
			</div>
		</div>
	);
}

function EmptyConversation() {
	return (
		<div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2 py-12 text-center text-sm">
			<p className="font-semibold">No messages yet</p>
			<p>
				Start the conversation — everyone in this room will get a notification.
			</p>
		</div>
	);
}

function ConversationLoading() {
	return (
		<div className="text-muted-foreground flex h-full items-center justify-center gap-2 text-sm">
			<Loader2 className={cn('size-4 animate-spin')} />
			Loading messages…
		</div>
	);
}

interface WinnerSubtitleProps {
	readonly conversation: Conversation;
}

/**
 * Header subtitle that pins the winner above the participant roster. Keeps
 * the conversation-view JSX shallow by isolating the "no subtitle for non-
 * winner types" branch here — `formatConversationSubtitle` already returns
 * null outside `winner_chat`, so this component just renders nothing in
 * that case and the parent stays oblivious to the conversation kind.
 */
function WinnerSubtitle({ conversation }: WinnerSubtitleProps) {
	const subtitle = formatConversationSubtitle(conversation);
	if (!subtitle) return null;
	return <p className="text-muted-foreground truncate text-xs">{subtitle}</p>;
}
