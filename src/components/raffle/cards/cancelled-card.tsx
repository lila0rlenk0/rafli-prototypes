import {
	CANCELLATION_REASON,
	type CancellationReason,
	isAutoReason,
} from '@/lib/utils/raffle/cancellation-reason';
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

export function RaffleCancelledCard({
	reason,
	isOwner,
	participantsCount,
	numberOfWinners,
	ticketsSoldCount,
	myTicketCount,
}: RaffleCancelledCardProps) {
	const isAuto = isAutoReason(reason);
	const title = isAuto ? 'Auto-Cancelled' : 'Cancelled';
	const showRefundNotice = !isOwner && myTicketCount > 0;

	function pluralize(count: number, singular: string): string {
		return count !== 1 ? `${singular}s` : singular;
	}

	function formatEntryCount(count: number): string {
		return count !== 1 ? `${count} entries` : `${count} entry`;
	}

	function formatParticipantCount(count: number): string {
		return `${count} ${pluralize(count, 'participant')}`;
	}

	// Message varies by cancellation reason × viewer role (host vs participant).
	function getMessage(): string {
		switch (reason) {
			case CANCELLATION_REASON.NO_TICKETS:
				return isOwner
					? 'This sweepstakes ended without any entry sales and was automatically cancelled.'
					: 'This sweepstakes ended without any participants and was automatically cancelled.';

			case CANCELLATION_REASON.INSUFFICIENT_PARTICIPANTS:
				return isOwner
					? `This sweepstakes needed at least ${formatParticipantCount(numberOfWinners)} but only had ${participantsCount}. It was automatically cancelled.`
					: `This sweepstakes needed at least ${formatParticipantCount(numberOfWinners)} to draw winners but didn't reach the minimum.`;

			case CANCELLATION_REASON.PARTIAL_PARTICIPATION:
				return isOwner
					? `This sweepstakes didn't reach the minimum participant threshold and was automatically cancelled.`
					: `This sweepstakes was cancelled because it didn't reach the minimum number of participants.`;

			case CANCELLATION_REASON.ADMIN_REJECTED:
				return 'This sweepstakes was reviewed and rejected by the platform.';

			case CANCELLATION_REASON.HOST_CANCELLED:
				return isOwner
					? 'You cancelled this sweepstakes.'
					: 'The host cancelled this sweepstakes before the draw.';
		}
	}

	const Icon = isAuto ? UserX : CircleOff;

	return (
		<div className="rounded-2xl border border-black bg-white px-16 py-8">
			<Icon className="mx-auto size-12" />

			<h2 className="font-clash-display mt-8 text-center text-2xl font-semibold">
				{title}
			</h2>

			<p className="mt-4 text-center text-sm text-gray-600">{getMessage()}</p>

			{showRefundNotice ? (
				<div className="mt-4 rounded-lg bg-sky-100 p-3 text-center text-sm">
					<p>
						You had <strong>{formatEntryCount(myTicketCount)}</strong> &mdash;
						all purchases are automatically refunded.
					</p>
				</div>
			) : null}

			{isOwner && ticketsSoldCount > 0 ? (
				<p className="mt-3 text-center text-xs text-gray-500">
					{formatEntryCount(ticketsSoldCount)} sold &mdash; all purchases are
					automatically refunded.
				</p>
			) : null}
		</div>
	);
}
