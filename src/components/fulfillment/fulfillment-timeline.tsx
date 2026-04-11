'use client';

import {
	AlertTriangle,
	CheckCircle2,
	Clock,
	ExternalLink,
	ShieldCheck,
	Users,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { ReviewHostModal } from '@/components/host/review-host-modal';
import {
	type ActionableKycStatus,
	getKycNudgeCopy,
	resolveKycNudgeStatus,
} from '@/lib/utils/kyc-nudge';
import { checkReview } from '@/services/review/check-review';
import { confirmReceived } from '@/services/winning/confirm-received';
import { markDelivered } from '@/services/winning/mark-delivered';
import type { VerificationStatus } from '@/types/verification-status';
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
	/**
	 * Winner's kyc_winner verification status. Null when host view or when the
	 * status fetch failed. The nudge is only rendered when the winner hasn't
	 * completed KYC ('approved') — all other states get a tailored message.
	 */
	kycStatus?: VerificationStatus | null;
}

type StepStatus = 'completed' | 'active' | 'pending';

export function FulfillmentTimeline({
	winning,
	isHost,
	raffleId,
	hostId,
	publicSlug,
	kycStatus,
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

	const markDeliveredText = isMarkingDelivered
		? 'Marking...'
		: 'Mark as Delivered';
	const confirmButtonText = isConfirming
		? 'Confirming...'
		: 'I received the prize';

	function getStepStatus(step: number): StepStatus {
		// pending / legacy pending_partial_fulfillment: winner hasn't claimed yet
		if (
			currentStatus === 'pending' ||
			currentStatus === 'pending_partial_fulfillment'
		) {
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

	function getClaimStep() {
		const status = getStepStatus(1);
		// Legacy pending_partial_fulfillment is semantically equivalent to pending
		const hasClaimed =
			currentStatus !== 'pending' &&
			currentStatus !== 'pending_partial_fulfillment';

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
							{markDeliveredText}
						</button>
					) : null,
			};
		}

		return {
			title: 'Shipped',
			description: (
				<>
					{status === 'active'
						? 'Your prize has been shipped and is on its way'
						: 'Your prize is on the way'}
					{/* Tracking link + host notes — only shown when host has provided them */}
					{/* Render tracking link only for http(s) URLs — rejects javascript:/data: schemes */}
					{winning.proofUrl?.match(/^https?:\/\//i) ? (
						<a
							href={winning.proofUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
						>
							Track shipment
							<ExternalLink className="size-3" />
						</a>
					) : null}
					{winning.hostNotes ? (
						<span className="mt-1 block text-sm text-gray-500 italic">
							{winning.hostNotes}
						</span>
					) : null}
				</>
			),
			action: null,
		};
	}

	// No action buttons for disputed — handled externally
	function getDisputedStep() {
		return {
			title: 'Dispute in Progress',
			description: isHost
				? 'Winner has opened a dispute. Awaiting resolution.'
				: 'Your dispute is being reviewed. We will notify you of the outcome.',
			action: null,
		};
	}

	// Admin resolved — informational only, no actions
	function getResolvedStep() {
		return {
			title: 'Dispute Resolved',
			description: isHost
				? 'The dispute has been resolved by an administrator.'
				: 'Your dispute has been resolved. Check your email for details.',
			action: null,
		};
	}

	// Backend auto-confirms receipt 48h after deliveredAt
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

	// Winner can confirm from both 'sent' and 'delivered' statuses.
	function getDeliveredStep() {
		const status = getStepStatus(4);
		const isReceived = currentStatus === 'received';

		// sent (winner view) → skip host's delivered step and go straight to confirm
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
						{confirmButtonText}
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

/**
 * KYC verification nudge shown to winners who haven't completed kyc_winner verification.
 *
 * The parent (`FulfillmentTimeline`) filters 'approved' before rendering — this
 * component only receives statuses that need user attention or are informational.
 *
 * Copy, icon, and CTA vary by status:
 * - 'none': never started — primary call to action
 * - 'draft': started but didn't finalize — resume
 * - 'in_review': finalized, admin review pending — informational only
 * - 'rejected': admin rejected — re-submit with reason hint
 *
 * This is a UX nudge only — it does NOT block the shipping form since the
 * backend is the authoritative enforcement boundary for claim eligibility.
 */
function KycNudge({ status }: { status: ActionableKycStatus }) {
	// in_review is purely informational — no CTA, no action needed from the winner.
	if (status === 'in_review') {
		return (
			<div className="mb-6 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
				<Clock className="mt-0.5 size-5 shrink-0 text-blue-600" />
				<div className="flex-1">
					<p className="text-sm font-semibold text-blue-900">
						Identity verification under review
					</p>
					<p className="mt-1 text-sm text-blue-800">
						We&apos;ll notify you once your submission has been reviewed. You
						can still submit your shipping info in the meantime.
					</p>
				</div>
			</div>
		);
	}

	// TS narrows status to 'none' | 'draft' | 'rejected' after the in_review guard.
	const copy = getKycNudgeCopy(status);

	return (
		<div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
			{status === 'rejected' ? (
				<AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
			) : (
				<ShieldCheck className="mt-0.5 size-5 shrink-0 text-amber-600" />
			)}
			<div className="flex-1">
				<p className="text-sm font-semibold text-amber-900">{copy.title}</p>
				<p className="mt-1 text-sm text-amber-800">{copy.body}</p>
				<Link
					href="/verification"
					className="mt-3 inline-flex items-center gap-1 rounded-full border-2 border-amber-900 bg-amber-900 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-50 hover:text-amber-900"
				>
					<CheckCircle2 className="size-3" />
					{copy.cta}
				</Link>
			</div>
		</div>
	);
}
