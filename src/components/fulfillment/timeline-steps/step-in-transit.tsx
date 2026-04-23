import { ExternalLink } from 'lucide-react';

import type { Winning } from '@/types/winning';

import { TimelineStep } from '../timeline-step';

type StepStatus = 'completed' | 'active' | 'pending';

interface StepInTransitProps {
	status: StepStatus;
	isHost: boolean;
	winning: Winning;
	isMarkingDelivered: boolean;
	/** Marks the winning as delivered — only wired for host on active */
	onMarkDelivered: () => void;
}

/**
 * Step 3 — in-transit phase. Host sees "Shipped" with a mark-as-delivered
 * CTA while active; winner sees a tracking link + host notes when provided.
 *
 * The tracking link is scheme-gated to `http(s)` via regex to reject
 * `javascript:` / `data:` URLs, which the backend should already reject
 * but we double-check at render time.
 *
 * @param props - Visual status, role, winning record, loading flag, handler
 * @returns TimelineStep wrapping the role-appropriate copy
 */
export function StepInTransit({
	status,
	isHost,
	winning,
	isMarkingDelivered,
	onMarkDelivered,
}: StepInTransitProps) {
	if (isHost) {
		const markDeliveredText = isMarkingDelivered
			? 'Marking...'
			: 'Mark as Delivered';

		const action =
			status === 'active' ? (
				<button
					onClick={onMarkDelivered}
					disabled={isMarkingDelivered}
					className="cursor-pointer rounded-full border-2 border-black bg-black px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
				>
					{markDeliveredText}
				</button>
			) : null;

		return (
			<TimelineStep
				title="Shipped"
				description="Prize has been shipped to winner"
				status={status}
				action={action}
			/>
		);
	}

	// Render tracking link only for http(s) URLs — rejects javascript:/data: schemes
	const hasTrackingLink = winning.proofUrl?.match(/^https?:\/\//i);

	const description = (
		<>
			{status === 'active'
				? 'Your prize has been shipped and is on its way'
				: 'Your prize is on the way'}
			{hasTrackingLink ? (
				<a
					href={winning.proofUrl ?? undefined}
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
	);

	return (
		<TimelineStep title="Shipped" description={description} status={status} />
	);
}
