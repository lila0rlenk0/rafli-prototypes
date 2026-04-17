'use client';

import { Inbox, Loader2 } from 'lucide-react';
import { useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { useConversations } from '@/services/chat/use-conversations';
import type { Conversation } from '@/types/chat';

import { ChatListItem } from './chat-list-item';

interface ChatListProps {
	readonly viewerId: string;
	readonly selectedConversationId?: string;
	/** Base URL for conversation deep links — parent provides so admin + user layouts can share the list. */
	readonly hrefBase: string;
}

/**
 * Conversation sidebar. Paginates via React Query infinite query; "Load more"
 * is explicit rather than auto-triggered to keep the UI predictable under
 * low-connectivity conditions.
 */
export function ChatList({
	viewerId,
	selectedConversationId,
	hrefBase,
}: ChatListProps) {
	const {
		data,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isLoading,
		error,
	} = useConversations();

	const conversations = useMemo<readonly Conversation[]>(() => {
		if (!data) return [];
		// Flatten pages — React Query keeps them newest-first per our
		// `getNextPageParam` convention.
		return data.pages.flatMap(page => page.conversations);
	}, [data]);

	if (isLoading) {
		return (
			<div className="text-muted-foreground flex h-full items-center justify-center gap-2 text-sm">
				<Loader2 className="size-4 animate-spin" />
				Loading conversations…
			</div>
		);
	}

	if (error) {
		return (
			<div className="text-muted-foreground p-6 text-center text-sm">
				Couldn’t load your conversations. Retry by refreshing.
			</div>
		);
	}

	if (conversations.length === 0) {
		// Sidebar empty-state mirrors the right-pane empty pane on purpose —
		// on mobile only this column renders, so it must teach the surface
		// on its own without relying on the desktop two-pane layout.
		return (
			<div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm">
				<div className="bg-muted text-foreground/70 flex size-10 items-center justify-center rounded-full">
					<Inbox className="size-5" />
				</div>
				<div className="flex max-w-[14rem] flex-col gap-1">
					<p className="text-foreground font-semibold">No conversations yet</p>
					<p className="leading-relaxed">
						A chat opens here automatically the moment you win a raffle or
						someone wins one of yours.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex h-full min-h-0 flex-col">
			<div className="flex-1 overflow-y-auto">
				{conversations.map(conversation => (
					<ChatListItem
						key={conversation.id}
						conversation={conversation}
						viewerId={viewerId}
						selected={conversation.id === selectedConversationId}
						href={`${hrefBase}/${conversation.id}`}
					/>
				))}
			</div>
			{hasNextPage ? (
				<div className="border-t p-3">
					<Button
						variant="ghost"
						size="sm"
						className="w-full"
						onClick={() => fetchNextPage()}
						disabled={isFetchingNextPage}
					>
						{isFetchingNextPage ? (
							<>
								<Loader2 className="mr-2 size-3 animate-spin" />
								Loading…
							</>
						) : (
							'Load more'
						)}
					</Button>
				</div>
			) : null}
		</div>
	);
}
