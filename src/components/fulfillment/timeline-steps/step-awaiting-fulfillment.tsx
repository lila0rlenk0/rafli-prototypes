import type { WinningStatus } from '@/types/winning';

import { TimelineStep } from '../timeline-step';

type StepStatus = 'completed' | 'active' | 'pending';

interface StepAwaitingFulfillmentProps {
	status: StepStatus;
	isHost: boolean;
	currentStatus: WinningStatus;
	/** Opens the claim-shipping modal — only wired for winners on active */
	onOpenShippingModal: () => void;
}

/**
 * Step 1 — claim phase. Host sees "Awaiting Winner" / "Claimed"; winner
 * sees "Claim Prize" / "Claimed" with the submit-shipping CTA while active.
 *
 * Legacy `pending_partial_fulfillment` is semantically equivalent to
 * `pending` — both signal "winner hasn't claimed yet", so the `hasClaimed`
 * guard treats them uniformly.
 *
 * @param props - Step visual status, role, lifecycle status, modal opener
 * @returns TimelineStep wrapping the role-appropriate copy
 */
export function StepAwaitingFulfillment({
	status,
	isHost,
	currentStatus,
	onOpenShippingModal,
}: StepAwaitingFulfillmentProps) {
	// Legacy pending_partial_fulfillment is semantically equivalent to pending
	const hasClaimed =
		currentStatus !== 'pending' &&
		currentStatus !== 'pending_partial_fulfillment';

	if (isHost) {
		return (
			<TimelineStep
				title={hasClaimed ? 'Claimed' : 'Awaiting Winner'}
				description={
					hasClaimed
						? 'Winner has submitted shipping info'
						: 'Waiting for winner to submit shipping address'
				}
				status={status}
			/>
		);
	}

	const action =
		status === 'active' ? (
			<button
				onClick={onOpenShippingModal}
				className="cursor-pointer rounded-full border-2 border-black bg-black px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-black"
			>
				Submit Shipping Info
			</button>
		) : null;

	return (
		<TimelineStep
			title={hasClaimed ? 'Claimed' : 'Claim Prize'}
			description={
				hasClaimed
					? 'You have submitted your shipping info'
					: 'Submit your shipping address to receive your prize'
			}
			status={status}
			action={action}
		/>
	);
}
