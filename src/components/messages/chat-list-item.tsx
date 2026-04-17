'use client';

import Link from 'next/link';

import { cn } from '@/lib/utils';
import { useChatStore } from '@/providers/chat-store-provider';
import type { Conversation } from '@/types/chat';

import { AvatarCircle } from './avatar-circle';
import {
	formatConversationSubtitle,
	formatConversationTitle,
	formatRelativeTime,
	resolveViewerRole,
} from './chat-utils';

interface ChatListItemProps {
	readonly conversation: Conversation;
	readonly viewerId: string;
	readonly selected: boolean;
	readonly href: string;
}

/**
 * One row in the conversation sidebar: avatar, title, last-message preview,
 * relative timestamp, unread badge. Selection state is driven by parent
 * (matches the active route segment).
 */
export function ChatListItem({
	conversation,
	viewerId,
	selected,
	href,
}: ChatListItemProps) {
	const unread = useChatStore(s => s.unreadByConvoId[conversation.id] ?? 0);

	// Derive the "other party" tint by role so the list reads at a glance
	// even without loaded profile metadata. Host chats show the host tint,
	// winner chats show the winner tint, etc. `rosterMembers` is the
	// prioritized slice (host + winner + admins first) so for raffle rooms
	// we pivot on a top-ranked member rather than an arbitrary one.
	const pivotMember =
		conversation.rosterMembers.find(m => m.userId !== viewerId) ??
		conversation.rosterMembers[0];
	const pivotRole = pivotMember
		? resolveViewerRole(conversation, pivotMember.userId)
		: null;
	// Title prefers the server-enriched raffle title so the inbox
	// distinguishes winner chats across raffles instead of stacking identical
	// "Winner Chat" rows. Subtitle surfaces the winner's display name so host
	// and winner can find the right row at a glance.
	const conversationTitle = formatConversationTitle(conversation);
	const conversationSubtitle = formatConversationSubtitle(conversation);
	const lastMessagePreview =
		conversation.lastMessage?.body ?? 'No messages yet';

	return (
		<Link
			href={href}
			aria-current={selected ? 'page' : undefined}
			className={cn(
				'flex items-center gap-3 border-b px-4 py-3 transition-colors',
				selected ? 'bg-muted' : 'hover:bg-muted/60',
			)}
		>
			<AvatarCircle
				displayName={conversationTitle}
				role={pivotRole ?? undefined}
			/>
			<div className="flex min-w-0 flex-1 flex-col">
				<div className="flex items-center justify-between gap-2">
					{/* `min-w-0 flex-1` is load-bearing: flex children default to
					    `min-width: auto` (content-sized) which blocks `truncate`
					    from clipping long raffle titles — they'd push the timestamp
					    out of the row instead of ellipsising. */}
					<span className="min-w-0 flex-1 truncate text-sm font-semibold">
						{conversationTitle}
					</span>
					<span className="text-muted-foreground shrink-0 text-[11px]">
						{formatRelativeTime(
							conversation.lastMessage?.createdAt ?? conversation.createdAt,
						)}
					</span>
				</div>
				{conversationSubtitle ? (
					<span className="text-muted-foreground truncate text-[11px]">
						{conversationSubtitle}
					</span>
				) : null}
				<div className="flex items-center justify-between gap-2">
					{/* Same `min-w-0 flex-1` rationale as the title row — prevents
					    a long last-message body from shoving the unread badge out. */}
					<span className="text-muted-foreground min-w-0 flex-1 truncate text-xs">
						{lastMessagePreview}
					</span>
					{unread > 0 ? (
						<span
							className="bg-primary text-primary-foreground inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold"
							aria-label={`${unread} unread`}
						>
							{unread > 9 ? '9+' : unread}
						</span>
					) : null}
				</div>
			</div>
		</Link>
	);
}
