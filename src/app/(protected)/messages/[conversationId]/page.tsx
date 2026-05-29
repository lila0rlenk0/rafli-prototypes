import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ChatInbox } from '@/components/messages/chat/inbox';
import { requireAuth } from '@/lib/auth/session';
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
 *   1. Proxy — `/messages` is a protected route; unauthenticated users
 *      are redirected before reaching this render. `requireAuth()` covers
 *      the narrow window where the JWT expires between the middleware
 *      check and this page render.
 *   2. `getConversation` — backend returns 403 for non-members, which
 *      we fold into `notFound()` (same shape as 404).
 */
export default async function ConversationPage({
	params,
}: ConversationPageProps) {
	const { conversationId } = await params;

	// Parallel: requireAuth and getConversation are independent — no shared inputs.
	const [{ user }, result] = await Promise.all([
		requireAuth(),
		getConversation(conversationId),
	]);

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
