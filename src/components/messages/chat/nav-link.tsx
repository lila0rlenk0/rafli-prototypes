'use client';

import { MessageCircle } from 'lucide-react';
import Link from 'next/link';

import { useChatStore } from '@/providers/chat-store-provider';

/**
 * Navbar chat icon. Mirrors `NotificationBell` visually but routes to
 * `/messages` and renders an unread badge from the chat store (driven
 * by `useUnreadSummary` + real-time WS events).
 */
export function ChatNavLink() {
	const unreadTotal = useChatStore(s => s.unreadTotal);

	return (
		<Link
			href="/messages"
			className="relative inline-flex cursor-pointer items-center justify-center"
			aria-label={
				unreadTotal > 0 ? `Messages (${unreadTotal} unread)` : 'Messages'
			}
		>
			<MessageCircle className="size-5" />
			{unreadTotal > 0 ? (
				<span className="bg-brand-dark text-on-dark text-3xs absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full font-medium">
					{unreadTotal > 9 ? '9+' : unreadTotal}
				</span>
			) : null}
		</Link>
	);
}
