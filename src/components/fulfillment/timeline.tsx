'use client';

import { Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { ReviewHostModal } from '@/components/host/review-host-modal';
import { resolveKycNudgeStatus } from '@/lib/utils/kyc-nudge';
import { checkReview } from '@/services/review/check-review';
import { confirmReceived } from '@/services/winning/confirm-received';
import { markDelivered } from '@/services/winning/mark-delivered';
import type { VerificationStatus } from '@/types/verification-status';
import type { Winning } from '@/types/winning';

import { KycNudge } from './kyc-nudge';
import { MarkSentModal } from './mark-sent-modal';
import { ShippingFormModal } from './shipping-form-modal';
import { StepAwaitingFulfillment } from './timeline-steps/step-awaiting-fulfillment';
import { StepDelivered } from './timeline-steps/step-delivered';
import { StepInTransit } from './timeline-steps/step-in-transit';
import { StepShipping } from './timeline-steps/step-shipping';
import { useFulfillmentModals } from './use-modals';
import { useFulfillmentTimelineState } from './use-timeline-state';

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
	/**
	 * Winner's kyc_winner verification status. Null when host view or when the
	 * status fetch failed. The nudge is only rendered when the winner hasn't
	 * completed KYC ('approved') — all other states get a tailored message.
	 */
	kycStatus?: VerificationStatus | null;
}

export function FulfillmentTimeline({
	winning,
	isHost,
	raffleId,
	hostId,
	publicSlug,
	kycStatus,
}: FulfillmentTimelineProps) {
	const router = useRouter();

	const {
		currentStatus,
		setCurrentStatus,
		shippingInfo,
		setShippingInfo,
		isConfirming,
		setIsConfirming,
		isMarkingDelivered,
		setIsMarkingDelivered,
		getStepStatus,
	} = useFulfillmentTimelineState(winning, { isHost });

	const {
		shippingModalOpen,
		setShippingModalOpen,
		markSentModalOpen,
		setMarkSentModalOpen,
		reviewModalOpen,
		setReviewModalOpen,
	} = useFulfillmentModals();

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

		// Auto-open the review modal when the user is eligible — avoids forcing
		// winners to hunt for the "Leave review" button after confirming.
		const reviewResult = await checkReview(raffleId);
		if (
			reviewResult.success &&
			reviewResult.data.canReview &&
			!reviewResult.data.hasReviewed
		) {
			setReviewModalOpen(true);
		}
	}

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

	function handleShippingSuccess(updatedWinning: Winning) {
		setShippingInfo(updatedWinning.shippingInfo ?? null);
		setCurrentStatus('awaiting_host');
		router.refresh();
	}

	function handleMarkSentSuccess() {
		setCurrentStatus('sent');
		router.refresh();
	}

	// Resolve KYC nudge visibility via the pure helper (tested separately).
	// Returns null to hide, or a narrowed status to render.
	const actionableKycStatus = resolveKycNudgeStatus({
		isHost,
		kycStatus: kycStatus ?? null,
		winningStatus: currentStatus,
	});

	return (
		<div className="rounded-2xl border border-black bg-white p-6">
			<div className="mb-6 flex items-center justify-between">
				<h3 className="text-lg font-semibold">Delivery status</h3>
				{isHost ? (
					<Link
						href={`/browse/${publicSlug}/fulfillment`}
						className="flex items-center gap-2 text-sm font-medium text-gray-600 transition-colors hover:text-black"
					>
						<Users className="size-4" />
						Manage All Winners
					</Link>
				) : null}
			</div>

			{actionableKycStatus ? <KycNudge status={actionableKycStatus} /> : null}

			<div className="flex flex-col gap-0">
				<StepAwaitingFulfillment
					status={getStepStatus(1)}
					isHost={isHost}
					currentStatus={currentStatus}
					onOpenShippingModal={() => setShippingModalOpen(true)}
				/>
				<StepShipping
					status={getStepStatus(2)}
					isHost={isHost}
					shippingInfo={shippingInfo}
					onOpenMarkSentModal={() => setMarkSentModalOpen(true)}
				/>
				<StepInTransit
					status={getStepStatus(3)}
					isHost={isHost}
					winning={winning}
					isMarkingDelivered={isMarkingDelivered}
					onMarkDelivered={handleMarkDelivered}
				/>
				<StepDelivered
					status={getStepStatus(4)}
					isHost={isHost}
					currentStatus={currentStatus}
					winning={winning}
					isConfirming={isConfirming}
					onConfirmReceived={handleConfirmReceived}
					onOpenReviewModal={() => setReviewModalOpen(true)}
				/>
			</div>

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
