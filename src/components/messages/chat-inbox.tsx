'use client';

import { MessagesSquare, ShieldCheck } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { Conversation } from '@/types/chat';

import { ChatList } from './chat-list';
import { ConversationView } from './conversation-view';

interface ChatInboxProps {
	readonly viewerId: string;
	/**
	 * Viewer display name from the authenticated session — drives the
	 * monogram on the viewer's own message bubbles and pending-send bubble.
	 * Member names for other participants aren't in the chat DTOs, so those
	 * avatars fall back to the id-hash letter.
	 */
	readonly viewerName: string;
	/** Selected conversation when the URL carries one. `null` renders the empty-state on desktop. */
	readonly selectedConversation: Conversation | null;
	/** Base URL the list uses to build deep-link hrefs (e.g. `/messages`). */
	readonly hrefBase: string;
}

/**
 * Two-pane inbox: conversation list on the left, conversation view on
 * the right. Responsive — on mobile, only one pane renders at a time so
 * a user either sees the list or drills into a specific conversation.
 *
 * Selection is URL-driven: the route segment (`/messages/[id]`) decides
 * which conversation shows. This keeps the back-button behaviour intact
 * and lets deep links from push notifications land on the correct pane
 * without hydrating any selection state.
 */
export function ChatInbox({
	viewerId,
	viewerName,
	selectedConversation,
	hrefBase,
}: ChatInboxProps) {
	return (
		<div className="flex h-[calc(100dvh-10rem)] min-h-[520px] flex-col gap-3">
			<div className="bg-background flex min-h-0 flex-1 overflow-hidden rounded-2xl border shadow-sm">
				{/* Sidebar — hides on mobile when a conversation is selected */}
				<aside
					className={cn(
						'w-full border-r sm:w-80 sm:shrink-0',
						selectedConversation
							? 'hidden sm:flex sm:flex-col'
							: 'flex flex-col',
					)}
				>
					<ChatList
						viewerId={viewerId}
						selectedConversationId={selectedConversation?.id}
						hrefBase={hrefBase}
					/>
				</aside>

				{/* Main pane — hides on mobile when no selection */}
				<main
					className={cn(
						'min-w-0 flex-1',
						selectedConversation
							? 'flex flex-col'
							: 'hidden sm:flex sm:flex-col',
					)}
				>
					{selectedConversation ? (
						<ConversationView
							/* key={conversationId} forces a fresh mount per
							   conversation — `react-effects.md` says reset state
							   via `key`, not via an effect. The first-scroll ref
							   and the message-list scroll position are intrinsic
							   to the rendered conversation, so a remount is the
							   correct boundary; React Query keys by conversationId
							   already so no extra refetch results from this. */
							key={selectedConversation.id}
							conversation={selectedConversation}
							viewerId={viewerId}
							viewerName={viewerName}
						/>
					) : (
						<InboxEmptyPane />
					)}
				</main>
			</div>

			{/*
			 * Moderation disclaimer rendered outside the card so it reads as a
			 * platform-wide notice rather than a property of any single
			 * conversation. Kept small and muted to avoid stealing focus from
			 * the chat itself — the goal is awareness, not intimidation.
			 */}
			<ModerationNotice />
		</div>
	);
}

/**
 * Right-pane empty state shown when the viewer hasn't selected a
 * conversation yet. The original copy ("Select a conversation…") left
 * new users wondering what the surface is for and how chats get
 * created — this version answers those questions inline so the page
 * teaches itself without a tooltip or onboarding modal.
 */
function InboxEmptyPane() {
	return (
		<div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-4 px-8 py-12 text-center text-sm">
			<div className="bg-muted text-foreground/70 flex size-12 items-center justify-center rounded-full">
				<MessagesSquare className="size-6" />
			</div>
			<div className="flex max-w-sm flex-col gap-2">
				<p className="text-foreground text-base font-semibold">
					Your conversations live here
				</p>
				<p className="leading-relaxed">
					Chats open automatically when you win a raffle or host one — winners
					and hosts can coordinate delivery, payment details, and anything else
					the prize needs.
				</p>
				<p className="leading-relaxed">
					Pick a conversation from the list to keep talking. You can&rsquo;t
					start a chat manually — they&rsquo;re created for you when a raffle
					result makes one necessary.
				</p>
			</div>
		</div>
	);
}

/**
 * Compact moderation notice anchored below the inbox card. Wording is
 * deliberately informational rather than threatening — tells the user
 * that chats are reviewed and that abusive or fraudulent behaviour has
 * consequences, which also signals to good-faith users that the channel
 * is safe to use.
 */
function ModerationNotice() {
	// Centered horizontally so the notice reads as a platform statement
	// rather than a label tied to the sidebar's left edge.
	return (
		<p className="text-muted-foreground flex items-center justify-center gap-2 px-1 text-center text-xs leading-relaxed whitespace-nowrap">
			<ShieldCheck className="size-3.5 shrink-0" aria-hidden="true" />
			<span>
				Messages are reviewed by our automated moderation system. Harassment,
				scams, off-platform payment requests, or other violations of our
				community guidelines may result in suspension or a permanent ban.
			</span>
		</p>
	);
}
