'use client';

import { Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { ReviewHostModal } from '@/components/host/review-host-modal';
import { checkReview } from '@/services/review/check-review';
import { confirmReceived } from '@/services/winning/confirm-received';
import { markDelivered } from '@/services/winning/mark-delivered';
import type { ShippingInfo, Winning, WinningStatus } from '@/types/winning';

import { MarkSentModal } from './mark-sent-modal';
import { ShippingFormModal } from './shipping-form-modal';
import { TimelineStep } from './timeline-step';

interface FulfillmentTimelineProps {
	/** The winning entry data */
	winning: Winning;
	/** Whether current user is the host */
	isHost: boolean;
	/** The raffle ID */
	raffleId: string;
	/** The host ID */
	hostId: string;
	/** Public slug for sharing */
	publicSlug: string;
	/** Whether this raffle concluded with partial participation (revenue share) */
	isPartialFulfillment?: boolean;
}

type StepStatus = 'completed' | 'active' | 'pending';

/**
 * FulfillmentTimeline Component
 *
 * Displays delivery status as a 4-step timeline.
 * Shows different actions for host vs winner based on current status.
 */
export function FulfillmentTimeline({
	winning,
	isHost,
	raffleId,
	hostId,
	publicSlug,
	isPartialFulfillment = false,
}: FulfillmentTimelineProps) {
	const router = useRouter();
	const [currentStatus, setCurrentStatus] = useState<WinningStatus>(
		winning.status,
	);
	const [shippingInfo, setShippingInfo] = useState<ShippingInfo | null>(
		winning.shippingInfo ?? null,
	);
	const [isConfirming, setIsConfirming] = useState(false);
	const [isMarkingDelivered, setIsMarkingDelivered] = useState(false);

	// Modal states
	const [shippingModalOpen, setShippingModalOpen] = useState(false);
	const [markSentModalOpen, setMarkSentModalOpen] = useState(false);
	const [reviewModalOpen, setReviewModalOpen] = useState(false);

	/** Button text for mark delivered action */
	function getMarkDeliveredText(): string {
		return isMarkingDelivered ? 'Marking...' : 'Mark as Delivered';
	}

	/** Button text for confirm receipt action */
	function getConfirmButtonText(): string {
		return isConfirming ? 'Confirming...' : 'I received the prize';
	}

	/**
	 * Determines step status based on current winning status
	 */
	function getStepStatus(step: number): StepStatus {
		// pending_partial_fulfillment: platform handles payout, no shipping timeline
		// All steps shown as completed since no host/winner action is needed
		if (currentStatus === 'pending_partial_fulfillment') {
			return 'completed';
		}

		// pending: winner hasn't claimed yet
		if (currentStatus === 'pending') {
			if (step === 1) return 'active';
			return 'pending';
		}

		// awaiting_host: winner claimed with shipping, host needs to ship
		if (currentStatus === 'awaiting_host') {
			if (step === 1) return 'completed';
			if (step === 2) return 'active';
			return 'pending';
		}

		// sent: role-aware — host sees step 3 active (mark delivered),
		// winner sees step 4 active (confirm receipt, skipping host's delivered step)
		if (currentStatus === 'sent') {
			if (isHost) {
				if (step <= 2) return 'completed';
				if (step === 3) return 'active';
				return 'pending';
			}
			// Winner: steps 1-3 completed, step 4 active
			if (step <= 3) return 'completed';
			if (step === 4) return 'active';
			return 'pending';
		}

		// delivered: steps 1-3 completed, step 4 active
		if (currentStatus === 'delivered') {
			if (step <= 3) return 'completed';
			if (step === 4) return 'active';
			return 'pending';
		}

		// disputed: steps 1-3 completed, step 4 active (informational — no action)
		if (currentStatus === 'disputed') {
			if (step <= 3) return 'completed';
			if (step === 4) return 'active';
			return 'pending';
		}

		// received/resolved: all steps completed
		if (currentStatus === 'received' || currentStatus === 'resolved') {
			return 'completed';
		}

		// unknown: all pending
		return 'pending';
	}

	/**
	 * Gets step 1 (Claim) content based on role and status
	 */
	function getClaimStep() {
		const status = getStepStatus(1);
		const hasClaimed = currentStatus !== 'pending';

		if (isHost) {
			return {
				title: hasClaimed ? 'Claimed' : 'Awaiting Winner',
				description: hasClaimed
					? 'Winner has submitted shipping info'
					: 'Waiting for winner to submit shipping address',
				action: null,
			};
		}

		return {
			title: hasClaimed ? 'Claimed' : 'Claim Prize',
			description: hasClaimed
				? 'You have submitted your shipping info'
				: 'Submit your shipping address to receive your prize',
			action:
				status === 'active' ? (
					<button
						onClick={() => setShippingModalOpen(true)}
						className="cursor-pointer rounded-full border-2 border-black bg-black px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-black"
					>
						Submit Shipping Info
					</button>
				) : null,
		};
	}

	/**
	 * Gets step 2 (Preparing) content based on role
	 */
	function getPreparingStep() {
		const status = getStepStatus(2);

		if (isHost) {
			return {
				title: 'Ready to Ship',
				description:
					status === 'active' && shippingInfo
						? `Ship to: ${shippingInfo.name}, ${shippingInfo.address}, ${shippingInfo.city}, ${shippingInfo.zip}, ${shippingInfo.country}`
						: 'Prepare the prize for shipment',
				action:
					status === 'active' && shippingInfo ? (
						<button
							onClick={() => setMarkSentModalOpen(true)}
							className="cursor-pointer rounded-full border-2 border-black bg-black px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-black"
						>
							Mark as Sent
						</button>
					) : null,
			};
		}

		return {
			title: 'Preparing Shipment',
			description: 'The host is preparing your prize for shipment',
			action: null,
		};
	}

	/**
	 * Gets step 3 (Shipped) content based on role
	 */
	function getShippedStep() {
		const status = getStepStatus(3);

		if (isHost) {
			return {
				title: 'Shipped',
				description: 'Prize has been shipped to winner',
				action:
					status === 'active' ? (
						<button
							onClick={handleMarkDelivered}
							disabled={isMarkingDelivered}
							className="cursor-pointer rounded-full border-2 border-black bg-black px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
						>
							{getMarkDeliveredText()}
						</button>
					) : null,
			};
		}

		return {
			title: 'Shipped',
			description:
				status === 'active'
					? 'Your prize has been shipped and is on its way'
					: 'Your prize is on the way',
			action: null,
		};
	}

	/**
	 * Gets step 4 content when status is 'disputed'
	 * No action buttons — dispute is handled externally
	 */
	function getDisputedStep() {
		return {
			title: 'Dispute in Progress',
			description: isHost
				? 'Winner has opened a dispute. Awaiting resolution.'
				: 'Your dispute is being reviewed. We will notify you of the outcome.',
			action: null,
		};
	}

	/**
	 * Gets step 4 content when status is 'resolved'
	 * Admin resolved a dispute — informational only, no actions
	 */
	function getResolvedStep() {
		return {
			title: 'Dispute Resolved',
			description: isHost
				? 'The dispute has been resolved by an administrator.'
				: 'Your dispute has been resolved. Check your email for details.',
			action: null,
		};
	}

	/**
	 * Computes auto-confirm deadline text for delivered status
	 * Backend auto-confirms receipt 48h after deliveredAt
	 */
	function getAutoConfirmText(): string | null {
		if (!winning.deliveredAt) return null;

		const deadline = new Date(winning.deliveredAt);
		deadline.setHours(deadline.getHours() + 48);

		const now = new Date();
		const hoursLeft = Math.max(
			0,
			Math.ceil((deadline.getTime() - now.getTime()) / (1_000 * 60 * 60)),
		);

		if (hoursLeft <= 0) return 'Auto-confirming soon...';
		return `Auto-confirms in ${hoursLeft}h if not confirmed`;
	}

	/**
	 * Gets step 4 (Delivered / Confirm Receipt) content based on role and status.
	 * Winner can confirm from both 'sent' and 'delivered' statuses.
	 */
	function getDeliveredStep() {
		const status = getStepStatus(4);
		const isReceived = currentStatus === 'received';

		/**
		 * Contextual title for step 4:
		 * - received → "Completed"
		 * - sent (winner view) → "Confirm Receipt" (skipping host's delivered step)
		 * - delivered / other → "Delivered"
		 */
		function getStep4Title(): string {
			if (isReceived) return 'Completed';
			if (currentStatus === 'sent') return 'Confirm Receipt';
			return 'Delivered';
		}

		if (isHost) {
			return {
				title: isReceived ? 'Completed' : 'Delivered',
				description: isReceived
					? 'Winner has confirmed receipt'
					: 'Waiting for winner to confirm receipt',
				action: null,
			};
		}

		/** Show auto-confirm countdown for delivered status (winner only) */
		const autoConfirm =
			currentStatus === 'delivered' ? getAutoConfirmText() : null;
		const deliveredDescription = autoConfirm
			? `Please confirm when you receive your prize. ${autoConfirm}`
			: 'Please confirm when you receive your prize';

		return {
			title: getStep4Title(),
			description: isReceived
				? 'Prize delivered successfully'
				: deliveredDescription,
			action:
				status === 'active' && !isReceived ? (
					<button
						onClick={handleConfirmReceived}
						disabled={isConfirming}
						className="cursor-pointer rounded-full border-2 border-black bg-black px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
					>
						{getConfirmButtonText()}
					</button>
				) : isReceived ? (
					<button
						onClick={() => setReviewModalOpen(true)}
						className="cursor-pointer rounded-full border border-black px-6 py-2 text-sm font-semibold transition-colors hover:bg-black hover:text-white"
					>
						Leave review
					</button>
				) : null,
		};
	}

	/**
	 * Handles confirm received action (winner)
	 */
	async function handleConfirmReceived() {
		setIsConfirming(true);

		const result = await confirmReceived(winning.id, publicSlug);

		setIsConfirming(false);

		if (!result.success) {
			toast.error('Failed to confirm receipt. Please try again.');
			return;
		}

		setCurrentStatus('received');
		toast.success('Prize receipt confirmed!');
		router.refresh();

		// Check if user can review and open modal
		const reviewResult = await checkReview(raffleId);
		if (
			reviewResult.success &&
			reviewResult.data.canReview &&
			!reviewResult.data.hasReviewed
		) {
			setReviewModalOpen(true);
		}
	}

	/**
	 * Handles mark delivered action (host)
	 */
	async function handleMarkDelivered() {
		setIsMarkingDelivered(true);

		const result = await markDelivered(winning.id, publicSlug);

		setIsMarkingDelivered(false);

		if (!result.success) {
			toast.error('Failed to mark as delivered. Please try again.');
			return;
		}

		setCurrentStatus('delivered');
		toast.success('Marked as delivered!');
		router.refresh();
	}

	/**
	 * Handles successful shipping form submission
	 * Uses real winning data from backend instead of dummy placeholder
	 */
	function handleShippingSuccess(updatedWinning: Winning) {
		setShippingInfo(updatedWinning.shippingInfo ?? null);
		setCurrentStatus('awaiting_host');
		router.refresh();
	}

	/**
	 * Handles successful mark sent
	 */
	function handleMarkSentSuccess() {
		setCurrentStatus('sent');
		router.refresh();
	}

	// ==========================================
	// Partial Fulfillment (Payout) Timeline
	// ==========================================
	// Platform handles payouts automatically — no host/winner actions needed.
	// 4 steps: Winner Selected → Prize Calculated → Processing Payout → Payout Complete

	/**
	 * Determines payout step status for partial fulfillment
	 * pending_partial_fulfillment → steps 1-2 done, step 3 active, step 4 pending
	 * received → all 4 completed
	 */
	function getPayoutStepStatus(step: number): StepStatus {
		if (currentStatus === 'received') return 'completed';

		// pending_partial_fulfillment (or any other status): processing payout
		if (step <= 2) return 'completed';
		if (step === 3) return 'active';
		return 'pending';
	}

	/**
	 * Formats the distribution amount for display
	 * @returns Formatted dollar string or fallback
	 */
	function formatDistribution(): string {
		if (!winning.distributionAmount) return 'Calculating your share...';
		const amount = parseFloat(winning.distributionAmount);
		return `Your share: $${amount.toFixed(2)}`;
	}

	if (isPartialFulfillment) {
		return (
			<div className="rounded-2xl border border-black bg-white p-6">
				<h3 className="mb-6 text-lg font-semibold">Payout status</h3>

				<div className="space-y-0">
					<TimelineStep
						title="Winner Selected"
						description="You've been selected as a winner"
						status={getPayoutStepStatus(1)}
					/>
					<TimelineStep
						title="Prize Calculated"
						description={formatDistribution()}
						status={getPayoutStepStatus(2)}
					/>
					<TimelineStep
						title="Processing Payout"
						description="Platform is processing your payout"
						status={getPayoutStepStatus(3)}
					/>
					<TimelineStep
						title="Payout Complete"
						description="Funds have been distributed"
						status={getPayoutStepStatus(4)}
						isLast
					/>
				</div>
			</div>
		);
	}

	// ==========================================
	// Standard Shipping Timeline
	// ==========================================

	const claimStep = getClaimStep();
	const preparingStep = getPreparingStep();
	const shippedStep = getShippedStep();
	// Step 4: disputed → dispute UI, resolved → admin resolution UI, else → delivery UI
	function getStep4() {
		if (currentStatus === 'disputed') return getDisputedStep();
		if (currentStatus === 'resolved') return getResolvedStep();
		return getDeliveredStep();
	}
	const step4 = getStep4();

	return (
		<div className="rounded-2xl border border-black bg-white p-6">
			<div className="mb-6 flex items-center justify-between">
				<h3 className="text-lg font-semibold">Delivery status</h3>
				{isHost && (
					<Link
						href={`/browse/${publicSlug}/fulfillment`}
						className="flex items-center gap-2 text-sm font-medium text-gray-600 transition-colors hover:text-black"
					>
						<Users className="size-4" />
						Manage All Winners
					</Link>
				)}
			</div>

			<div className="space-y-0">
				<TimelineStep
					title={claimStep.title}
					description={claimStep.description}
					status={getStepStatus(1)}
					action={claimStep.action}
				/>
				<TimelineStep
					title={preparingStep.title}
					description={preparingStep.description}
					status={getStepStatus(2)}
					action={preparingStep.action}
				/>
				<TimelineStep
					title={shippedStep.title}
					description={shippedStep.description}
					status={getStepStatus(3)}
					action={shippedStep.action}
				/>
				<TimelineStep
					title={step4.title}
					description={step4.description}
					status={getStepStatus(4)}
					isLast
					action={step4.action}
				/>
			</div>

			{/* Modals */}
			<ShippingFormModal
				open={shippingModalOpen}
				onOpenChange={setShippingModalOpen}
				raffleId={raffleId}
				publicSlug={publicSlug}
				onSuccess={handleShippingSuccess}
			/>

			<MarkSentModal
				open={markSentModalOpen}
				onOpenChange={setMarkSentModalOpen}
				winningId={winning.id}
				publicSlug={publicSlug}
				onSuccess={handleMarkSentSuccess}
			/>

			<ReviewHostModal
				open={reviewModalOpen}
				onOpenChange={setReviewModalOpen}
				raffleId={raffleId}
				hostId={hostId}
				publicSlug={publicSlug}
			/>
		</div>
	);
}
