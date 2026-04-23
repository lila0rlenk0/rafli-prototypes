'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { MarkSentModal } from '@/components/fulfillment/mark-sent-modal';
import { ShippingFormModal } from '@/components/fulfillment/shipping-form-modal';
import { Button } from '@/components/ui/button';
import { confirmReceived } from '@/services/winning/confirm-received';
import { markDelivered } from '@/services/winning/mark-delivered';
import { WINNING_STATUS, type WinningStatus } from '@/types/winning';

import type { ViewerRole } from '../chat/chat-present';
import { VIEWER_ROLE } from '../chat/chat-present';

interface WinnerChatActionsProps {
	readonly raffleId: string;
	readonly winningId: string | null;
	readonly currentStatus: WinningStatus;
	readonly viewerRole: ViewerRole | null;
}

/**
 * Step-specific CTA button the stepper renders under the currently-active
 * row. Gated on `viewerRole` so the host never sees the winner's
 * "Submit shipping info" button and vice-versa; returns `null` when the
 * current viewer has no action to take (admin-owned states like
 * `disputed`, terminal states, or roles that aren't participants).
 *
 * Reuses the existing fulfillment modals (`ShippingFormModal`,
 * `MarkSentModal`) and services (`markDelivered`, `confirmReceived`) so
 * the chat surface doesn't fork any business logic — the fulfillment
 * page and the chat stepper fire the same server actions.
 *
 * `publicSlug` isn't available in the chat DTO today — an empty string
 * is forwarded to the underlying services, whose revalidation path
 * treats missing slug as a no-op (see `revalidateWinningPaths`). The
 * `/my-raffles` tag still invalidates, which is the tag the chat cares
 * about. When the conversation DTO starts carrying slug the caller can
 * thread it through without API changes here.
 */
export function WinnerChatActions({
	raffleId,
	winningId,
	currentStatus,
	viewerRole,
}: WinnerChatActionsProps) {
	const router = useRouter();
	const [shippingModalOpen, setShippingModalOpen] = useState(false);
	const [markSentModalOpen, setMarkSentModalOpen] = useState(false);
	const [isMarkingDelivered, startMarkDelivered] = useTransition();
	const [isConfirming, startConfirmReceived] = useTransition();

	const isWinner = viewerRole === VIEWER_ROLE.WINNER;
	const isHost = viewerRole === VIEWER_ROLE.HOST;

	// Pending → winner claims via ShippingFormModal. winningId isn't
	// required because ClaimPrizeCommand is keyed by raffleId (backend
	// resolves the winning row for the current user).
	//
	// Legacy `pending_partial_fulfillment` rows collapse to the pending
	// step everywhere else (stepper, status badge, label) — keep the
	// action CTA consistent so historic rows aren't actionless.
	const isPendingLike =
		currentStatus === WINNING_STATUS.PENDING ||
		currentStatus === WINNING_STATUS.PENDING_PARTIAL_FULFILLMENT;
	if (isPendingLike && isWinner) {
		return (
			<>
				<Button size="sm" onClick={() => setShippingModalOpen(true)}>
					Submit shipping info
				</Button>
				<ShippingFormModal
					open={shippingModalOpen}
					onOpenChange={setShippingModalOpen}
					raffleId={raffleId}
					publicSlug=""
					onSuccess={() => router.refresh()}
				/>
			</>
		);
	}

	// Awaiting host → host ships + attaches proof via MarkSentModal.
	// Requires winningId because MarkSentCommand is keyed by winning row.
	if (
		currentStatus === WINNING_STATUS.AWAITING_HOST &&
		isHost &&
		winningId !== null
	) {
		return (
			<>
				<Button size="sm" onClick={() => setMarkSentModalOpen(true)}>
					Mark as sent
				</Button>
				<MarkSentModal
					open={markSentModalOpen}
					onOpenChange={setMarkSentModalOpen}
					winningId={winningId}
					publicSlug=""
					onSuccess={() => router.refresh()}
				/>
			</>
		);
	}

	// Sent → host confirms physical delivery. No modal — one-shot mutation
	// wrapped in a transition for the disabled-while-pending affordance.
	if (currentStatus === WINNING_STATUS.SENT && isHost && winningId !== null) {
		// Rebind the narrowed id as a const so the async closure captures
		// `string` instead of `string | null` — TS re-widens narrowing across
		// the useTransition callback boundary, and a non-null assertion inside
		// would hide that the gate above is the proof of non-null.
		const boundWinningId = winningId;
		function handleMarkDelivered() {
			startMarkDelivered(async () => {
				const result = await markDelivered(boundWinningId, '');
				if (!result.success) {
					toast.error('Failed to mark as delivered. Please try again.');
					return;
				}
				toast.success('Marked as delivered.');
				router.refresh();
			});
		}
		return (
			<Button
				size="sm"
				onClick={handleMarkDelivered}
				disabled={isMarkingDelivered}
			>
				{isMarkingDelivered ? 'Marking…' : 'Mark as delivered'}
			</Button>
		);
	}

	// Delivered → winner confirms receipt (or the cron auto-confirms 48h
	// after delivery per AUTO_CONFIRM_THRESHOLD_MS).
	if (
		currentStatus === WINNING_STATUS.DELIVERED &&
		isWinner &&
		winningId !== null
	) {
		// Same rebinding rationale as the sent branch above — see comment.
		const boundWinningId = winningId;
		function handleConfirmReceived() {
			startConfirmReceived(async () => {
				const result = await confirmReceived(boundWinningId, '');
				if (!result.success) {
					toast.error('Failed to confirm receipt. Please try again.');
					return;
				}
				toast.success('Receipt confirmed.');
				router.refresh();
			});
		}
		return (
			<Button size="sm" onClick={handleConfirmReceived} disabled={isConfirming}>
				{isConfirming ? 'Confirming…' : 'Confirm received'}
			</Button>
		);
	}

	// Everything else — terminal states (received / resolved), admin-only
	// states (disputed), and states where the viewer isn't the actor —
	// intentionally renders nothing.
	return null;
}
