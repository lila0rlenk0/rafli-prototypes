import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { ChatInbox } from '@/components/messages/chat-inbox';
import { getCurrentUser } from '@/lib/auth/session';

export const metadata: Metadata = {
	title: 'Messages',
};

/**
 * Inbox root — no selected conversation. Desktop shows an empty-state
 * pane on the right inviting the user to pick a conversation; mobile
 * shows only the list.
 *
 * `getCurrentUser` is the React.cache-wrapped accessor required by
 * `.claude/rules/lib.md` for server components — dedupes the cookie read
 * with the parent layout's session check. The `(protected)` layout's
 * `AuthGuard` already blocks unauthenticated access, so the redirect here
 * is a defensive second layer (covers a session that expires between the
 * layout render and this page render).
 */
export default async function MessagesPage() {
	const user = await getCurrentUser();
	if (!user) redirect('/sign-in');

	return (
		<ChatInbox
			viewerId={user.id}
			viewerName={user.name}
			selectedConversation={null}
			hrefBase="/messages"
		/>
	);
}
