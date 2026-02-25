import {
	CANCELLATION_REASON,
	type CancellationReason,
	isAutoReason,
} from '@/lib/utils/cancellation-reason';
import { CircleOff, UserX } from 'lucide-react';

interface RaffleCancelledCardProps {
	/** Why the raffle was cancelled */
	reason: CancellationReason;
	/** Whether the viewer is the raffle host */
	isOwner: boolean;
	/** Total participants at time of cancellation */
	participantsCount: number;
	/** Winners required for the draw */
	numberOfWinners: number;
	/** Total tickets sold */
	ticketsSoldCount: number;
	/** How many tickets the current user had (0 if not a participant) */
	myTicketCount: number;
}

/**
 * RaffleCancelledCard Component
 *
 * Sidebar card shown on the detail page when a raffle is cancelled.
 * Differentiates between host-cancelled and auto-cancelled (system) scenarios,
 * showing contextual messages per reason and viewer role.
 */
export function RaffleCancelledCard({
	reason,
	isOwner,
	participantsCount,
	numberOfWinners,
	ticketsSoldCount,
	myTicketCount,
}: RaffleCancelledCardProps) {
	const isAuto = isAutoReason(reason);

	/** Title text based on cancellation type */
	function getTitle(): string {
		return isAuto ? 'Auto-Cancelled' : 'Cancelled';
	}

	/**
	 * Contextual message explaining what happened.
	 * Varies by reason × role (host vs participant).
	 */
	function getMessage(): string {
		switch (reason) {
			case CANCELLATION_REASON.NO_TICKETS:
				return isOwner
					? 'This raffle ended without any ticket sales and was automatically cancelled.'
					: 'This raffle ended without any participants and was automatically cancelled.';

			case CANCELLATION_REASON.INSUFFICIENT_PARTICIPANTS:
				return isOwner
					? `This raffle needed at least ${numberOfWinners} participant${numberOfWinners !== 1 ? 's' : ''} but only had ${participantsCount}. It was automatically cancelled.`
					: `This raffle needed at least ${numberOfWinners} participant${numberOfWinners !== 1 ? 's' : ''} to draw winners but didn't reach the minimum.`;

			case CANCELLATION_REASON.HOST_CANCELLED:
				return isOwner
					? 'You cancelled this raffle.'
					: 'The host cancelled this raffle before the draw.';
		}
	}

	/**
	 * Whether to show refund notice.
	 * Only relevant for participants who had tickets in a cancelled raffle.
	 */
	function shouldShowRefundNotice(): boolean {
		return !isOwner && myTicketCount > 0;
	}

	const Icon = isAuto ? UserX : CircleOff;

	return (
		<div className="rounded-2xl border border-black bg-white px-16 py-8">
			<Icon className="mx-auto size-12" />

			<h2 className="font-clash-display mt-8 text-center text-2xl font-semibold">
				{getTitle()}
			</h2>

			<p className="mt-4 text-center text-sm text-gray-600">{getMessage()}</p>

			{shouldShowRefundNotice() && (
				<div className="mt-4 rounded-lg bg-[#E1F8FF] p-3 text-center text-sm">
					<p>
						You had{' '}
						<strong>
							{myTicketCount} ticket{myTicketCount !== 1 ? 's' : ''}
						</strong>{' '}
						&mdash; all purchases are automatically refunded.
					</p>
				</div>
			)}

			{isOwner && ticketsSoldCount > 0 && (
				<p className="mt-3 text-center text-xs text-gray-500">
					{ticketsSoldCount} ticket{ticketsSoldCount !== 1 ? 's' : ''} sold
					&mdash; all purchases are automatically refunded.
				</p>
			)}
		</div>
	);
}
