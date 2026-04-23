'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { usePollMyTicketCodes } from '@/services/ticket/use-poll-my-ticket-codes';

interface UseCryptoPurchaseSyncOptions {
	raffleId: string;
	/** Server-rendered ticket total before the purchase — baseline for deltas. */
	myTicketsTotal: number;
}

interface UseCryptoPurchaseSyncResult {
	/** Invoked by the checkout modal on success; begins the polling window. */
	handleCryptoSuccess: (confirmedQuantity: number) => void;
}

/**
 * Owns the post-crypto-payment "wait for server ticket count to catch up"
 * loop. Encapsulates:
 *  - the `ticketSyncTarget` state (null = not polling)
 *  - a one-shot ref so dev Strict Mode re-runs don't re-refresh
 *  - the effect that clears the target + calls `router.refresh()` once the
 *    poll settles (either synced or expired)
 *
 * Extracted so the button component can stay focused on click
 * orchestration and Reown AppKit wiring.
 *
 * @returns A stable `handleCryptoSuccess` callback to hand to the checkout modal.
 */
export function useCryptoPurchaseSync({
	raffleId,
	myTicketsTotal,
}: UseCryptoPurchaseSyncOptions): UseCryptoPurchaseSyncResult {
	const router = useRouter();
	// Expected ticket total after a successful crypto purchase. We keep
	// polling ticket codes until the server-rendered "My Tickets" source
	// of truth reaches this number, then trigger one final router.refresh.
	const [ticketSyncTarget, setTicketSyncTarget] = useState<number | null>(null);
	// Dev Strict Mode can re-run effects; resolve each target once to
	// avoid duplicate terminal refreshes when sync completes or times out.
	const resolvedTicketSyncTarget = useRef<number | null>(null);

	const { isExpired, isSynced } = usePollMyTicketCodes(
		ticketSyncTarget !== null ? raffleId : null,
		ticketSyncTarget,
	);

	// useEffect: bridges external polling hook state into component state
	// + router. Cleanup not needed — queueMicrotask is fire-and-forget.
	useEffect(() => {
		const didSyncSettle = isSynced || isExpired;
		if (ticketSyncTarget === null || !didSyncSettle) return;
		if (resolvedTicketSyncTarget.current === ticketSyncTarget) return;

		resolvedTicketSyncTarget.current = ticketSyncTarget;

		queueMicrotask(() => {
			setTicketSyncTarget(current =>
				current === ticketSyncTarget ? null : current,
			);
			router.refresh();
		});
	}, [isSynced, isExpired, router, ticketSyncTarget]);

	// Accepts confirmed quantity from the modal (not the parent prop)
	// because `ticketQuantity` can drift during the 30-120s confirming
	// window if the user changes the selector on the card.
	const handleCryptoSuccess = useCallback(
		(confirmedQuantity: number) => {
			resolvedTicketSyncTarget.current = null;
			router.refresh();
			setTicketSyncTarget(myTicketsTotal + confirmedQuantity);
		},
		[myTicketsTotal, router],
	);

	return { handleCryptoSuccess };
}
