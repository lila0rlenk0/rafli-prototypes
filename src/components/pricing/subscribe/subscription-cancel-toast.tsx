'use client';

// Client boundary: reads `?status=cancel`, fires a toast, then strips
// the param so a reload doesn't re-trigger it.

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

/**
 * Toast trigger for the `?status=cancel` path Stripe bounces users back
 * to when they abandon the checkout page. The success path is handled by
 * `SubscriptionSuccessDialog` — a toast isn't weighty enough for a paid
 * conversion, but it's exactly right for an abandoned intent.
 *
 * The two components split the query-param space cleanly: this one only
 * reacts to `cancel`, the dialog only reacts to `success`, so neither
 * races the other's `router.replace` flush.
 *
 * Renders nothing. Side-effect only.
 */
export function SubscriptionCancelToast() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const status = searchParams.get('status');

	// Tracks which cancel-status value we've surfaced for. Guards against
	// React 18 StrictMode double-mount (dev-only: effects run → clean →
	// run again, both times with the SAME status before `router.replace`
	// flushes the URL change) and against transient re-runs caused by
	// `searchParams` reference churn on unrelated query changes.
	// A ref rather than state because we never want a render from the guard.
	const lastHandledStatusRef = useRef<string | null>(null);

	useEffect(() => {
		// Step 1: No cancel status → nothing to do. Reset the guard so a
		// later Stripe round-trip (cancel → cleared → new cancel) re-fires.
		if (status !== 'cancel') {
			lastHandledStatusRef.current = null;
			return;
		}

		// Step 2: Idempotency guard — we've already fired the toast for
		// this exact status value on a prior run of this effect. Skip.
		if (lastHandledStatusRef.current === status) return;
		lastHandledStatusRef.current = status;

		// Step 3: Fire the cancel toast. Non-success tone (`toast()` not
		// `toast.error`) — the user chose to walk away, not an error.
		toast('Checkout cancelled. You can resubscribe any time.');

		// Step 4: Strip the status param so a reload doesn't re-fire the
		// toast. Building from the live searchParams preserves any
		// unrelated params (tracking, attribution, etc.).
		const next = new URLSearchParams(searchParams.toString());
		next.delete('status');
		const queryString = next.toString();
		router.replace(queryString ? `/pricing?${queryString}` : '/pricing', {
			scroll: false,
		});
	}, [status, searchParams, router]);

	return null;
}
