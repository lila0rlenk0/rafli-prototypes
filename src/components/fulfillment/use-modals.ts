'use client';

import { useState } from 'react';

interface FulfillmentModals {
	shippingModalOpen: boolean;
	setShippingModalOpen: (open: boolean) => void;
	markSentModalOpen: boolean;
	setMarkSentModalOpen: (open: boolean) => void;
	reviewModalOpen: boolean;
	setReviewModalOpen: (open: boolean) => void;
}

/**
 * Bundles the three mutually-independent modal booleans surfaced by the
 * fulfillment timeline (claim shipping, mark-as-sent, review-host). Keeping
 * them in a single hook trims the parent's state surface without creating
 * a shared state machine — each modal still opens/closes in isolation.
 *
 * @returns Open flags + setters for the three timeline modals
 */
export function useFulfillmentModals(): FulfillmentModals {
	const [shippingModalOpen, setShippingModalOpen] = useState(false);
	const [markSentModalOpen, setMarkSentModalOpen] = useState(false);
	const [reviewModalOpen, setReviewModalOpen] = useState(false);

	return {
		shippingModalOpen,
		setShippingModalOpen,
		markSentModalOpen,
		setMarkSentModalOpen,
		reviewModalOpen,
		setReviewModalOpen,
	};
}
