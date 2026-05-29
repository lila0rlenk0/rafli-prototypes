import type { Metadata } from 'next';

import { ChatInbox } from '@/components/messages/chat/inbox';
import { requireAuth } from '@/lib/auth/session';

export const metadata: Metadata = {
	title: 'Messages',
};

/**
 * Inbox root — no selected conversation. Desktop shows an empty-state
 * pane on the right inviting the user to pick a conversation; mobile
 * shows only the list.
 *
 * Auth is enforced by the proxy (`/messages` is a protected route) so no
 * in-page redirect is needed. `requireAuth()` narrows the session to
 * non-null and handles the edge case where the JWT expires between the
 * middleware check and this render without leaking a null-user render.
 */
export default async function MessagesPage() {
	const { user } = await requireAuth();

	return (
		<ChatInbox
			viewerId={user.id}
			viewerName={user.name}
			selectedConversation={null}
			hrefBase="/messages"
		/>
	);
}
