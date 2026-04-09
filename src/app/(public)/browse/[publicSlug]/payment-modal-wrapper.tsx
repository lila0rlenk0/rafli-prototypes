'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { use, useState } from 'react';

// Lazy-load — only needed after Stripe redirect (session_id present in URL)
const PaymentStatusModal = dynamic(
	() =>
		import('@/components/payment/payment-status-modal').then(m => ({
			default: m.PaymentStatusModal,
		})),
	{ ssr: false },
);

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
 *
 * Uses React's `use()` to unwrap the Next.js 15 Promise-based searchParams,
 * which integrates with Suspense boundaries instead of resolving inside useEffect.
 */
export function PaymentModalWrapper({
	publicSlug,
	searchParams,
}: PaymentModalWrapperProps) {
	const router = useRouter();
	// React `use()` unwraps the Next.js 15 Promise-based searchParams.
	// Integrates with the parent Suspense boundary instead of resolving inside useEffect.
	const params = use(searchParams);
	// Initialize modal open state from URL — true when Stripe redirects back with session_id
	const [isModalOpen, setIsModalOpen] = useState(!!params.session_id);

	/**
	 * Handles modal close — strips session_id from URL to prevent re-triggering on refresh.
	 * Uses router.replace to avoid adding a history entry.
	 */
	function handleOpenChange(open: boolean) {
		setIsModalOpen(open);

		if (!open) {
			router.replace(`/browse/${publicSlug}`, { scroll: false });
		}
	}

	if (!params.session_id) {
		return null;
	}

	return (
		<PaymentStatusModal
			key={params.session_id}
			publicSlug={publicSlug}
			stripeSessionId={params.session_id}
			open={isModalOpen}
			onOpenChange={handleOpenChange}
		/>
	);
}
