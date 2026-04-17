'use client';

import Link from 'next/link';

import { cn } from '@/lib/utils';
import { useChatStore } from '@/providers/chat-store-provider';
import type { Conversation } from '@/types/chat';

import { AvatarCircle } from './avatar-circle';
import {
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
	// winner chats show the winner tint, etc.
	const pivotMember =
		conversation.members.find(m => m.userId !== viewerId) ??
		conversation.members[0];
	const pivotRole = pivotMember
		? resolveViewerRole(conversation, pivotMember.userId)
		: null;
	// Member display names aren't in the chat DTOs today, so the list
	// monogram is derived from the conversation title itself. Matches
	// what the row header renders, so the avatar and title share a glyph.
	const conversationTitle = formatConversationTitle(conversation);

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
					<span className="truncate text-sm font-semibold">
						{conversationTitle}
					</span>
					<span className="text-muted-foreground shrink-0 text-[11px]">
						{formatRelativeTime(
							conversation.lastMessage?.createdAt ?? conversation.createdAt,
						)}
					</span>
				</div>
				<div className="flex items-center justify-between gap-2">
					<span className="text-muted-foreground truncate text-xs">
						{conversation.lastMessage?.body ?? 'No messages yet'}
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
