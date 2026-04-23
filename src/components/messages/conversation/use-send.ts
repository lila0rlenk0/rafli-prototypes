'use client';

import { toast } from 'sonner';

import {
	useChatStore,
	useChatTransport,
} from '@/providers/chat-store-provider';
import { useSendMessage } from '@/services/chat/use-send-message';

interface UseConversationSendArgs {
	readonly conversationId: string;
}

interface UseConversationSendResult {
	readonly handleSend: (body: string) => Promise<void>;
	readonly handleTyping: () => void;
	readonly isSending: boolean;
	readonly connected: boolean;
}

/**
 * Wires the message composer to the WS-first, REST-fallback send pipeline.
 *
 * Optimistic-update timing is load-bearing: we register the pending bubble
 * BEFORE attempting the WS frame so the user sees their text immediately
 * even if the transport is mid-reconnect. If WS accepts the frame the
 * server echoes back a real message that resolves the tempId; otherwise
 * we fall through to the REST mutation and resolve the tempId with the
 * returned `Message`.
 *
 * Error path is the ONLY place we surface a toast — the composer itself
 * just locks while `isSending` and never renders a retry affordance today.
 *
 * @param args - Conversation id the composer targets.
 * @returns Handlers + send-in-flight flag + connection state for placeholder copy.
 */
export function useConversationSend(
	args: UseConversationSendArgs,
): UseConversationSendResult {
	const { conversationId } = args;

	const transport = useChatTransport();
	const connected = useChatStore(s => s.connected);
	const upsertMessage = useChatStore(s => s.upsertMessage);
	const addPending = useChatStore(s => s.addPending);
	const failPending = useChatStore(s => s.failPending);

	const sendMessageMutation = useSendMessage();

	async function handleSend(body: string) {
		// Step 1: Optimistic — generate tempId, register pending bubble.
		const tempId = crypto.randomUUID();
		addPending(tempId, conversationId, body);

		// Step 2: Prefer WS transport — cheaper and faster than REST.
		if (connected && transport.sendMessage(conversationId, body, tempId)) {
			return;
		}

		// Step 3: REST fallback. On success the server echoes the message
		// via WS (if connected) or React Query invalidation; the store
		// resolves the tempId either way.
		try {
			const message = await sendMessageMutation.mutateAsync({
				conversationId,
				input: { body },
			});
			upsertMessage(message, tempId);
		} catch (err) {
			const code =
				err && typeof err === 'object' && 'code' in err
					? String((err as { code: unknown }).code)
					: 'unknown_error';
			failPending(tempId, code);
			toast.error('Couldn’t send message — tap failed message to retry.');
		}
	}

	function handleTyping() {
		// Cheap fire-and-forget; composer is already throttled.
		if (connected) transport.sendTyping(conversationId);
	}

	return {
		handleSend,
		handleTyping,
		isSending: sendMessageMutation.isPending,
		connected,
	};
}
