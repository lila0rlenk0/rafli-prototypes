'use client';

import { useEffect, useState } from 'react';

import { PaymentStatusModal } from '@/components/payment/payment-status-modal';

interface PaymentModalWrapperProps {
	raffleId: string;
	searchParams: Promise<{ session_id?: string }>;
}

/**
 * PaymentModalWrapper Component
 *
 * Detects URL parameters after Stripe redirect and opens PaymentStatusModal.
 * Manages modal state based on URL flags (?payment=success&orderId=xxx).
 */
export function PaymentModalWrapper({
	raffleId,
	searchParams,
}: PaymentModalWrapperProps) {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [sessionId, setSessionId] = useState<string | null>(null);

	/**
	 * Checks URL params and opens modal if payment flag is present
	 */
	useEffect(() => {
		async function checkPaymentStatus() {
			const params = await searchParams;

			// Check if we have sessionId in URL
			if (params.session_id) {
				setSessionId(params.session_id);
				setIsModalOpen(true);
			}
		}

		checkPaymentStatus();
	}, [searchParams]);

	// Don't render modal if no sessionId
	if (!sessionId) {
		return null;
	}

	return (
		<PaymentStatusModal
			sessionId={sessionId}
			raffleId={raffleId}
			open={isModalOpen}
			onOpenChange={setIsModalOpen}
		/>
	);
}
