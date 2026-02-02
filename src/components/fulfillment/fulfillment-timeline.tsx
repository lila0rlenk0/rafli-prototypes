'use client';

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
}: FulfillmentTimelineProps) {
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

	/**
	 * Determines step status based on current winning status
	 */
	function getStepStatus(step: number): StepStatus {
		// Special case: awaiting_host - depends on shipping info
		if (currentStatus === 'awaiting_host') {
			if (!shippingInfo) {
				if (step === 1) return 'active';
				return 'pending';
			}
			// has shipping info
			if (step === 1) return 'completed';
			if (step === 2) return 'active';
			return 'pending';
		}

		// sent: steps 1-2 completed, step 3 active
		if (currentStatus === 'sent') {
			if (step <= 2) return 'completed';
			if (step === 3) return 'active';
			return 'pending';
		}

		// delivered: steps 1-3 completed, step 4 active
		if (currentStatus === 'delivered' || currentStatus === 'disputed') {
			if (step <= 3) return 'completed';
			if (step === 4) return 'active';
			return 'pending';
		}

		// received/resolved: all steps completed
		if (currentStatus === 'received' || currentStatus === 'resolved') {
			return 'completed';
		}

		// pending or unknown: all pending
		return 'pending';
	}

	/**
	 * Gets step 1 (Claim) content based on role and shipping status
	 */
	function getClaimStep() {
		const status = getStepStatus(1);

		if (isHost) {
			return {
				title: shippingInfo ? 'Claimed' : 'Awaiting Winner',
				description: shippingInfo
					? 'Winner has submitted shipping info'
					: 'Waiting for winner to submit shipping address',
				action: null,
			};
		}

		return {
			title: shippingInfo ? 'Claimed' : 'Claim Prize',
			description: shippingInfo
				? 'You have submitted your shipping info'
				: 'Submit your shipping address to receive your prize',
			action:
				status === 'active' && !shippingInfo ? (
					<button
						onClick={() => setShippingModalOpen(true)}
						className="rounded-full bg-black px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
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
							className="rounded-full bg-black px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
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
							className="rounded-full bg-black px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{isMarkingDelivered ? 'Marking...' : 'Mark as Delivered'}
						</button>
					) : null,
			};
		}

		return {
			title: 'Shipped',
			description: 'Your prize is on the way',
			action:
				status === 'active' ? (
					<button
						onClick={handleConfirmReceived}
						disabled={isConfirming}
						className="rounded-full bg-black px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{isConfirming ? 'Confirming...' : 'I received the prize'}
					</button>
				) : null,
		};
	}

	/**
	 * Gets step 4 (Delivered) content based on role and status
	 */
	function getDeliveredStep() {
		const status = getStepStatus(4);
		const isReceived = currentStatus === 'received';

		if (isHost) {
			return {
				title: isReceived ? 'Completed' : 'Delivered',
				description: isReceived
					? 'Winner has confirmed receipt'
					: 'Waiting for winner to confirm receipt',
				action: null,
			};
		}

		return {
			title: isReceived ? 'Completed' : 'Delivered',
			description: isReceived
				? 'Prize delivered successfully'
				: 'Please confirm when you receive your prize',
			action:
				status === 'active' && !isReceived ? (
					<button
						onClick={handleConfirmReceived}
						disabled={isConfirming}
						className="rounded-full bg-black px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{isConfirming ? 'Confirming...' : 'I received the prize'}
					</button>
				) : isReceived ? (
					<button
						onClick={() => setReviewModalOpen(true)}
						className="rounded-full border border-black px-6 py-2 text-sm font-semibold transition-colors hover:bg-black hover:text-white"
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

		const result = await confirmReceived(winning.id);

		setIsConfirming(false);

		if (!result.success) {
			toast.error('Failed to confirm receipt. Please try again.');
			return;
		}

		setCurrentStatus('received');
		toast.success('Prize receipt confirmed!');

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

		const result = await markDelivered(winning.id);

		setIsMarkingDelivered(false);

		if (!result.success) {
			toast.error('Failed to mark as delivered. Please try again.');
			return;
		}

		setCurrentStatus('delivered');
		toast.success('Marked as delivered!');
	}

	/**
	 * Handles successful shipping form submission
	 */
	function handleShippingSuccess() {
		// Update local state to reflect shipping info submitted
		setShippingInfo({
			name: 'Submitted',
			address: '',
			city: '',
			zip: '',
			country: '',
		});
	}

	/**
	 * Handles successful mark sent
	 */
	function handleMarkSentSuccess() {
		setCurrentStatus('sent');
	}

	const claimStep = getClaimStep();
	const preparingStep = getPreparingStep();
	const shippedStep = getShippedStep();
	const deliveredStep = getDeliveredStep();

	return (
		<div className="rounded-2xl bg-white p-6">
			<h3 className="mb-6 text-lg font-semibold">Delivery status</h3>

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
					title={deliveredStep.title}
					description={deliveredStep.description}
					status={getStepStatus(4)}
					isLast
					action={deliveredStep.action}
				/>
			</div>

			{/* Modals */}
			<ShippingFormModal
				open={shippingModalOpen}
				onOpenChange={setShippingModalOpen}
				raffleId={raffleId}
				onSuccess={handleShippingSuccess}
			/>

			<MarkSentModal
				open={markSentModalOpen}
				onOpenChange={setMarkSentModalOpen}
				winningId={winning.id}
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
