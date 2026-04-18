import { MESSAGE_TYPE, type Message } from '@/types/chat';
import {
	WINNING_STATUS,
	type WinningStatus,
	winningStatusSchema,
} from '@/types/winning';

/**
 * Context pulled from a winner_chat conversation's messages, sufficient
 * to drive the stepper + action CTAs without a second backend round-trip.
 *
 * - `status` — most recent known state of the winning.
 * - `winningId` — populated as soon as any `shipment_update` message
 *   has been echoed into the chat. Null only during the initial
 *   `pending` window, before ClaimPrizeCommand has fired. Every
 *   action that needs a winningId (mark sent / delivered / confirm
 *   received) is reachable only *after* `awaiting_host`, by which
 *   point at least one shipment_update already exists — so UIs can
 *   safely gate those CTAs on a non-null winningId without a
 *   separate fetch.
 *   The pending → awaiting_host transition is driven by
 *   ClaimPrizeCommand, which only needs `raffleId` (see
 *   `claim-winning.ts`), so the winner CTA at pending doesn't
 *   require winningId either.
 */
export interface WinningChatContext {
	readonly status: WinningStatus;
	readonly winningId: string | null;
}

/**
 * Derive the current winning context from a conversation's messages.
 *
 * The authoritative source is the backend `winnings` row. The chat never
 * fetches it directly — instead the backend emits a `shipment_update`
 * message with `{ fromStatus, toStatus, winningId, ... }` metadata every
 * time the state machine advances (see
 * `raffles-core-backend/src/core/winnings/commands` and the chat
 * infrastructure's `winning-subscribers.ts`). Walking those is
 * sufficient to render the stepper + drive action CTAs without a second
 * round-trip from the chat surface.
 *
 * Messages hydrate ascending (see `conversation-view.tsx`), so the most
 * recent transition is at the tail. Iterating from the end short-
 * circuits on the first shipment_update we find.
 *
 * Resilience:
 * - No shipment_update yet → `{ status: pending, winningId: null }`.
 *   The backend seeds a `system` message on create, not a
 *   shipment_update, so this is the shape of a freshly-minted
 *   winner_chat before ClaimPrizeCommand fires.
 * - Unknown `toStatus` token (backend enum ahead of client) →
 *   status falls back to `pending`; winningId still surfaced because
 *   the metadata ID is trustworthy even if the enum isn't.
 *
 * @param messages - Conversation messages ascending by createdAt.
 * @returns Latest known status + winningId.
 */
export function deriveWinningStatusFromMessages(
	messages: readonly Message[],
): WinningChatContext {
	for (let index = messages.length - 1; index >= 0; index--) {
		const message = messages[index];
		if (message.type !== MESSAGE_TYPE.SHIPMENT_UPDATE) continue;
		if (!message.metadata) continue;
		const winningId = message.metadata.winningId;
		const parsed = winningStatusSchema.safeParse(message.metadata.toStatus);
		// Found the latest shipment_update — trust its toStatus when it
		// matches the known enum. An unknown token means the client is
		// behind the backend; fall back to pending (but still surface the
		// winningId — the UUID is contract-stable even when the enum
		// evolves, and hiding it would leave the CTA buttons dead for
		// no reason).
		if (parsed.success) return { status: parsed.data, winningId };
		return { status: WINNING_STATUS.PENDING, winningId };
	}
	return { status: WINNING_STATUS.PENDING, winningId: null };
}
