'use client';

import { MessageCircle } from 'lucide-react';
import Link from 'next/link';

import { FEATURE_FLAGS } from '@/lib/feature-flags';
import { useChatStore } from '@/providers/chat-store-provider';

/**
 * Navbar chat icon. Mirrors `NotificationBell` visually but routes to
 * `/messages` and renders an unread badge from the chat store (driven
 * by `useUnreadSummary` + real-time WS events).
 *
 * The outer component short-circuits before the store hook runs when
 * `CHAT_ENABLED` is off — so layouts that haven't yet mounted a
 * `ChatStoreProvider` during rollout don't trip the required-provider
 * throw. Separating the inner render keeps Rules-of-Hooks intact
 * (the hook is only called when the flag is compile-time-true).
 */
export function ChatNavLink() {
	if (!FEATURE_FLAGS.CHAT_ENABLED) return null;
	return <ChatNavLinkInner />;
}

function ChatNavLinkInner() {
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
				<span className="bg-primary text-primary-foreground absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full text-[10px] font-medium">
					{unreadTotal > 9 ? '9+' : unreadTotal}
				</span>
			) : null}
		</Link>
	);
}
