import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { ChatInbox } from '@/components/messages/chat-inbox';
import { getCurrentUser } from '@/lib/auth/session';
import { getConversation } from '@/services/chat/get-conversation';

export const metadata: Metadata = {
	title: 'Messages',
};

interface ConversationPageProps {
	readonly params: Promise<{ conversationId: string }>;
}

/**
 * Deep-linked conversation view. Fetches the target conversation
 * server-side so non-members see the same 404 as non-existent ids —
 * no information leaks about conversations the viewer can't access.
 *
 * Authorization is enforced twice:
 *   1. Parent `AuthGuard` — unauthenticated users never reach here.
 *      `getCurrentUser` short-circuits to a sign-in redirect on the
 *      narrow window where the session expires between the layout
 *      render and this page render.
 *   2. `getConversation` — backend returns 403 for non-members, which
 *      we fold into `notFound()` (same shape as 404).
 */
export default async function ConversationPage({
	params,
}: ConversationPageProps) {
	const { conversationId } = await params;

	const user = await getCurrentUser();
	if (!user) redirect('/sign-in');

	const result = await getConversation(conversationId);
	if (!result.success) {
		// Fold forbidden-not-member and not-found into the same response shape.
		// Any other failure (network, contract drift) also routes to notFound —
		// the user's recovery path is refresh, and we avoid rendering a
		// half-broken page on a transient issue.
		notFound();
	}

	return (
		<ChatInbox
			viewerId={user.id}
			viewerName={user.name}
			selectedConversation={result.data}
			hrefBase="/messages"
		/>
	);
}
