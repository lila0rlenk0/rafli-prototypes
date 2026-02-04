'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { PaymentStatusModal } from '@/components/payment/payment-status-modal';

interface PaymentModalWrapperProps {
	publicSlug: string;
	searchParams: Promise<{ session_id?: string }>;
}

/**
 * PaymentModalWrapper Component
 *
 * Detects URL parameters after Stripe redirect and opens PaymentStatusModal.
 * Manages modal state based on URL flags (?session_id=xxx).
 * Removes URL parameter when modal is closed to prevent re-showing on refresh.
 */
export function PaymentModalWrapper({
	publicSlug,
	searchParams,
}: PaymentModalWrapperProps) {
	const router = useRouter();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [sessionId, setSessionId] = useState<string | null>(null);

	/**
	 * Checks URL params and opens modal if payment flag is present
	 */
	useEffect(() => {
		async function checkPaymentStatus() {
			const params = await searchParams;

			if (params.session_id) {
				setSessionId(params.session_id);
				setIsModalOpen(true);
			}
		}

		checkPaymentStatus();
	}, [searchParams]);

	/**
	 * Handles modal close - removes session_id from URL
	 */
	function handleOpenChange(open: boolean) {
		setIsModalOpen(open);

		if (!open) {
			router.replace(`/browse/${publicSlug}`, { scroll: false });
		}
	}

	if (!sessionId) {
		return null;
	}

	return (
		<PaymentStatusModal
			sessionId={sessionId}
			raffleId={publicSlug}
			open={isModalOpen}
			onOpenChange={handleOpenChange}
		/>
	);
}
