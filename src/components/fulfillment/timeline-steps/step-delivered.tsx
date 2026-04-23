import type { Winning, WinningStatus } from '@/types/winning';

import { TimelineStep } from '../timeline-step';

type StepStatus = 'completed' | 'active' | 'pending';

interface StepDeliveredProps {
	status: StepStatus;
	isHost: boolean;
	currentStatus: WinningStatus;
	winning: Winning;
	isConfirming: boolean;
	/** Winner confirms receipt of the prize — wired for winners on active */
	onConfirmReceived: () => void;
	/** Opens the review-host modal — wired for winners post-receipt */
	onOpenReviewModal: () => void;
}

// Backend auto-confirms receipt 48h after deliveredAt.
// Returning null when deliveredAt is absent lets the caller fall back to
// the default copy.
function getAutoConfirmText(deliveredAt: string | null): string | null {
	if (!deliveredAt) return null;

	const deadline = new Date(deliveredAt);
	deadline.setHours(deadline.getHours() + 48);

	const now = new Date();
	const hoursLeft = Math.max(
		0,
		Math.ceil((deadline.getTime() - now.getTime()) / (1_000 * 60 * 60)),
	);

	if (hoursLeft <= 0) return 'Auto-confirming soon...';
	return `Auto-confirms in ${hoursLeft}h if not confirmed`;
}

// Winner-facing title — winners skip the host's delivered step and jump
// straight to "Confirm Receipt" from 'sent'.
function getWinnerTitle(options: {
	currentStatus: WinningStatus;
	isReceived: boolean;
}) {
	const { currentStatus, isReceived } = options;
	if (isReceived) return 'Completed';
	if (currentStatus === 'sent') return 'Confirm Receipt';
	return 'Delivered';
}

interface WinnerActionProps {
	status: StepStatus;
	isReceived: boolean;
	isConfirming: boolean;
	confirmButtonText: string;
	onConfirmReceived: () => void;
	onOpenReviewModal: () => void;
}

// Extracted so the parent stays under the JSX nesting cap.
function renderWinnerAction({
	status,
	isReceived,
	isConfirming,
	confirmButtonText,
	onConfirmReceived,
	onOpenReviewModal,
}: WinnerActionProps) {
	if (status === 'active' && !isReceived) {
		return (
			<button
				onClick={onConfirmReceived}
				disabled={isConfirming}
				className="cursor-pointer rounded-full border-2 border-black bg-black px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
			>
				{confirmButtonText}
			</button>
		);
	}
	if (isReceived) {
		return (
			<button
				onClick={onOpenReviewModal}
				className="cursor-pointer rounded-full border border-black px-6 py-2 text-sm font-semibold transition-colors hover:bg-black hover:text-white"
			>
				Leave review
			</button>
		);
	}
	return null;
}

/**
 * Step 4 — terminal phase. Routes to three shapes based on
 * `currentStatus`:
 *  - `disputed` → informational (no actions; dispute handled externally)
 *  - `resolved` → informational (admin resolution)
 *  - anything else → role-aware delivery flow (winner confirms receipt,
 *    host waits for confirmation)
 *
 * The winner can confirm from both 'sent' and 'delivered' statuses — the
 * title adapts, but the action is the same.
 *
 * @param props - Visual status, role, lifecycle state, handlers
 * @returns TimelineStep (always `isLast`)
 */
export function StepDelivered({
	status,
	isHost,
	currentStatus,
	winning,
	isConfirming,
	onConfirmReceived,
	onOpenReviewModal,
}: StepDeliveredProps) {
	// No action buttons for disputed — handled externally
	if (currentStatus === 'disputed') {
		return (
			<TimelineStep
				title="Dispute in Progress"
				description={
					isHost
						? 'Winner has opened a dispute. Awaiting resolution.'
						: 'Your dispute is being reviewed. We will notify you of the outcome.'
				}
				status={status}
				isLast
			/>
		);
	}

	// Admin resolved — informational only, no actions
	if (currentStatus === 'resolved') {
		return (
			<TimelineStep
				title="Dispute Resolved"
				description={
					isHost
						? 'The dispute has been resolved by an administrator.'
						: 'Your dispute has been resolved. Check your email for details.'
				}
				status={status}
				isLast
			/>
		);
	}

	const isReceived = currentStatus === 'received';

	if (isHost) {
		return (
			<TimelineStep
				title={isReceived ? 'Completed' : 'Delivered'}
				description={
					isReceived
						? 'Winner has confirmed receipt'
						: 'Waiting for winner to confirm receipt'
				}
				status={status}
				isLast
			/>
		);
	}

	const confirmButtonText = isConfirming
		? 'Confirming...'
		: 'I received the prize';

	const autoConfirm =
		currentStatus === 'delivered'
			? getAutoConfirmText(winning.deliveredAt)
			: null;
	const deliveredDescription = autoConfirm
		? `Please confirm when you receive your prize. ${autoConfirm}`
		: 'Please confirm when you receive your prize';

	return (
		<TimelineStep
			title={getWinnerTitle({ currentStatus, isReceived })}
			description={
				isReceived ? 'Prize delivered successfully' : deliveredDescription
			}
			status={status}
			isLast
			action={renderWinnerAction({
				status,
				isReceived,
				isConfirming,
				confirmButtonText,
				onConfirmReceived,
				onOpenReviewModal,
			})}
		/>
	);
}
