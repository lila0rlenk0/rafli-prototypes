'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { use, useLayoutEffect, useRef, useState } from 'react';

import { resolveStripeReturnSessionId } from '@/components/browse/public-slug/stripe-return-session';

// Lazy-load — only needed after Stripe redirect (session_id present in URL)
const PaymentStatusModal = dynamic(
	() =>
		import('@/components/payment/payment-status-modal').then(m => ({
			default: m.PaymentStatusModal,
		})),
	{ ssr: false },
);

interface PaymentModalHostProps {
	publicSlug: string;
	searchParams: Promise<{ session_id?: string }>;
}

/**
 * PaymentModalHost Component
 *
 * After Stripe redirect, `session_id` in the query string is captured into
 * state, then stripped via `router.replace` so the address bar and Referer
 * no longer carry the Stripe session identifier (session ID leak mitigated).
 */
export function PaymentModalHost({
	publicSlug,
	searchParams,
}: PaymentModalHostProps) {
	const router = useRouter();
	const params = use(searchParams);
	const fromUrl = params.session_id;
	const [capturedId, setCapturedId] = useState<string | null>(null);
	const didStrip = useRef(false);
	const displayId = resolveStripeReturnSessionId(capturedId, fromUrl);

	// `session_id` must move from the URL into state before we `replace`, or we lose the id for
	// the modal. React Compiler flags setState+effect, but the alternative (mutating a ref in
	// render) is also disallowed; this is the narrow sync path for a client-only return URL.
	useLayoutEffect(
		function stripStripeSessionFromAddressBar() {
			if (!fromUrl) return;
			// eslint-disable-next-line react-hooks/set-state-in-effect -- capture Stripe id, then strip query (see module comment; Referer leak)
			setCapturedId(function captureOnce(prev) {
				return prev ?? fromUrl;
			});
			if (!didStrip.current) {
				didStrip.current = true;
				router.replace(`/browse/${encodeURIComponent(publicSlug)}`, {
					scroll: false,
				});
			}
		},
		[fromUrl, publicSlug, router],
	);

	const [isModalOpen, setIsModalOpen] = useState(!!fromUrl);

	const handleOpenChange = (open: boolean) => {
		setIsModalOpen(open);

		if (!open) {
			router.replace(`/browse/${encodeURIComponent(publicSlug)}`, {
				scroll: false,
			});
		}
	};

	if (!displayId) {
		return null;
	}

	return (
		<PaymentStatusModal
			key={displayId}
			publicSlug={publicSlug}
			stripeSessionId={displayId}
			open={isModalOpen}
			onOpenChange={handleOpenChange}
		/>
	);
}
