import type { ShippingInfo } from '@/types/winning';

import { TimelineStep } from '../timeline-step';

type StepStatus = 'completed' | 'active' | 'pending';

interface StepShippingProps {
	status: StepStatus;
	isHost: boolean;
	shippingInfo: ShippingInfo | null;
	/** Opens the mark-as-sent modal — only wired for host on active */
	onOpenMarkSentModal: () => void;
}

/**
 * Step 2 — preparation phase. Host sees "Ready to Ship" with the shipping
 * address + mark-as-sent CTA; winner sees the informational "Preparing
 * Shipment" message.
 *
 * The shipping address is only rendered when active + present to avoid
 * leaking it after the host has already shipped.
 *
 * @param props - Visual status, role, shipping record, modal opener
 * @returns TimelineStep wrapping the role-appropriate copy
 */
export function StepShipping({
	status,
	isHost,
	shippingInfo,
	onOpenMarkSentModal,
}: StepShippingProps) {
	if (isHost) {
		const hasActiveShipping = status === 'active' && shippingInfo;
		const description = hasActiveShipping
			? `Ship to: ${shippingInfo.name}, ${shippingInfo.address}, ${shippingInfo.city}, ${shippingInfo.zip}, ${shippingInfo.country}`
			: 'Prepare the prize for shipment';

		const action = hasActiveShipping ? (
			<button
				onClick={onOpenMarkSentModal}
				className="cursor-pointer rounded-full border-2 border-black bg-black px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-black"
			>
				Mark as Sent
			</button>
		) : null;

		return (
			<TimelineStep
				title="Ready to Ship"
				description={description}
				status={status}
				action={action}
			/>
		);
	}

	return (
		<TimelineStep
			title="Preparing Shipment"
			description="The host is preparing your prize for shipment"
			status={status}
		/>
	);
}
