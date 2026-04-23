import { Loader2 } from 'lucide-react';
import type { RefObject } from 'react';

import { Button } from '@/components/ui/button';
import type { PendingSend } from '@/store/chat-store';
import { type Conversation, type Message } from '@/types/chat';
import type { WinningStatus } from '@/types/winning';

import { resolveViewerRole, type ViewerRole } from '../chat/chat-present';
import { EmptyConversation } from './empty';
import { MessageBubble } from '../message/bubble';
import { PendingBubble } from '../message/pending';
import { TypingIndicator } from '../message/typing-indicator';
import { WinnerChatIntroPanel } from '../winner/intro-panel';

interface PendingEntry {
	readonly tempId: string;
	readonly entry: PendingSend;
}

interface WinnerIntro {
	readonly status: WinningStatus;
	readonly winningId: string | null;
}

interface ConversationMessagesListProps {
	readonly conversation: Conversation;
	readonly viewerId: string;
	readonly viewerName: string;
	readonly viewerRole: ViewerRole | null;
	readonly messages: readonly Message[];
	readonly pendingForConvo: readonly PendingEntry[];
	readonly hasNextPage: boolean;
	readonly isFetchingNextPage: boolean;
	readonly onFetchNextPage: () => void;
	/**
	 * Winner-chat intro — precomputed by the parent so the list doesn't
	 * re-derive on every render. Null for non-winner conversations or when
	 * `raffleId` is missing (generic raffle_room).
	 */
	readonly winnerIntro: WinnerIntro | null;
	readonly showTypingIndicator: boolean;
	readonly scrollContainerRef: RefObject<HTMLDivElement | null>;
}

/**
 * Scrollable message list for a conversation. Renders, in order:
 *   - a "Load older" pagination button when more history exists.
 *   - the winner-chat intro panel (winner_chat only).
 *   - either the empty-state placeholder OR the interleaved confirmed +
 *     optimistic bubbles.
 *   - an inline typing indicator when someone else is typing.
 *
 * Pure presentation — all derived state (pagination flags, roles, winner
 * context, optimistic entries) is computed by the parent. The scroll
 * container ref is threaded down so `use-conversation-scroll` can drive
 * auto-scroll against the DOM element owned here.
 *
 * @param props - Messages + pagination + derived winner context + refs.
 * @returns JSX for the scrollable list.
 */
export function ConversationMessagesList(props: ConversationMessagesListProps) {
	const {
		conversation,
		viewerId,
		viewerName,
		viewerRole,
		messages,
		pendingForConvo,
		hasNextPage,
		isFetchingNextPage,
		onFetchNextPage,
		winnerIntro,
		showTypingIndicator,
		scrollContainerRef,
	} = props;

	const isEmpty = messages.length === 0 && pendingForConvo.length === 0;
	// Winner intro only renders when the backend gave us a non-null raffleId
	// (raffle_room intros would otherwise try to link a null raffle). Gate is
	// combined with `winnerIntro !== null` so callers can stay oblivious to
	// the conversation type — pass the precomputed intro or null.
	const showWinnerIntro =
		winnerIntro !== null && conversation.raffleId !== null;

	return (
		<div
			ref={scrollContainerRef}
			className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4"
			role="log"
			aria-live="polite"
		>
			{hasNextPage ? (
				<LoadOlderButton
					isFetchingNextPage={isFetchingNextPage}
					onFetchNextPage={onFetchNextPage}
				/>
			) : null}

			{showWinnerIntro && conversation.raffleId !== null && winnerIntro ? (
				<WinnerChatIntroPanel
					currentStatus={winnerIntro.status}
					raffleId={conversation.raffleId}
					winningId={winnerIntro.winningId}
					viewerRole={viewerRole}
				/>
			) : null}

			{isEmpty ? (
				<EmptyConversation />
			) : (
				<MessagesAndPending
					conversation={conversation}
					viewerId={viewerId}
					viewerName={viewerName}
					messages={messages}
					pendingForConvo={pendingForConvo}
				/>
			)}

			{showTypingIndicator ? (
				<div className="flex justify-start">
					<TypingIndicator />
				</div>
			) : null}
		</div>
	);
}

interface LoadOlderButtonProps {
	readonly isFetchingNextPage: boolean;
	readonly onFetchNextPage: () => void;
}

/**
 * "Load older messages" pagination affordance. Extracted so the list
 * component stays within the 3-level JSX nesting cap while keeping the
 * spinner-swap logic readable.
 *
 * @param props - In-flight flag + click handler.
 * @returns Paged-older trigger row.
 */
function LoadOlderButton({
	isFetchingNextPage,
	onFetchNextPage,
}: LoadOlderButtonProps) {
	return (
		<div className="flex justify-center">
			<Button
				variant="ghost"
				size="sm"
				onClick={onFetchNextPage}
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
	);
}

interface MessagesAndPendingProps {
	readonly conversation: Conversation;
	readonly viewerId: string;
	readonly viewerName: string;
	readonly messages: readonly Message[];
	readonly pendingForConvo: readonly PendingEntry[];
}

/**
 * Confirmed-message bubbles followed by optimistic (pending) bubbles.
 * Split out so the parent's empty-vs-loaded branch stays a single line and
 * the JSX nesting cap (3 levels) holds without a fragment-in-fragment.
 *
 * @param props - Conversation context + both message lists.
 * @returns JSX fragment with all bubbles.
 */
function MessagesAndPending({
	conversation,
	viewerId,
	viewerName,
	messages,
	pendingForConvo,
}: MessagesAndPendingProps) {
	return (
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
				<PendingBubble key={tempId} entry={entry} viewerName={viewerName} />
			))}
		</>
	);
}
