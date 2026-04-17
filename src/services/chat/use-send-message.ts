'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { serviceError, type ServiceError } from '@/lib/query/errors';
import type { ChatErrorCode } from '@/types/errors';
import type { Message, SendMessageInput } from '@/types/chat';

import { conversationsKey, messagesKey } from './query-keys';
import { sendMessage } from './send-message';

interface SendMessageVariables {
	conversationId: string;
	input: SendMessageInput;
}

/**
 * REST send-message mutation. Used as a fallback when the WS stream is
 * unavailable; normal operation goes through `ChatStream.sendMessage`.
 *
 * On success invalidates the message page and the conversation list so
 * the last-message preview refreshes for every tab/component subscribed
 * to those keys.
 *
 * @returns React Query mutation with typed variables and error.
 */
export function useSendMessage() {
	const queryClient = useQueryClient();

	return useMutation<
		Message,
		ServiceError<ChatErrorCode>,
		SendMessageVariables
	>({
		async mutationFn(variables) {
			const result = await sendMessage(
				variables.conversationId,
				variables.input,
			);
			if (!result.success) throw serviceError(result.error);
			return result.data;
		},
		onSuccess(_data, variables) {
			// Step 1: Refresh this conversation's message history so the new
			// message appears even if the WS stream is disconnected.
			void queryClient.invalidateQueries({
				queryKey: messagesKey(variables.conversationId),
			});
			// Step 2: Bust the conversation list so the sidebar's "last message"
			// preview updates. Cheap — list is short and cached.
			void queryClient.invalidateQueries({ queryKey: conversationsKey() });
		},
	});
}
