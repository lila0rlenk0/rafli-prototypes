'use client';

import Link from 'next/link';
import { useEffect, useId, useRef } from 'react';

import { cn } from '@/lib/class-names';
import { useTicketQuantityStore } from '@/providers/ticket-quantity-store-provider';

/**
 * Required acknowledgment checkbox rendered above the buy CTA inside the
 * `TicketPurchaseCard` on every breakpoint. Persists intent into the
 * page-scoped `TicketQuantityStore`; the desktop in-card "One Time
 * Purchase" trigger and the mobile sticky bottom CTA both check
 * `isAccessPassAcknowledged` on click and call `requestAcknowledgment`
 * (which scrolls back here + flips the inline error) when missing.
 *
 * Why store-backed: the mobile sticky CTA sits in a distant branch of
 * the page tree (fixed-position at the viewport bottom). The store hops
 * the gate over that tree without prop drilling, and the same store
 * already coordinates quantity + promo across the two surfaces.
 *
 * Why per-mount (not persisted): consent is transient. Each raffle visit
 * creates a fresh store instance (provider mounts on the raffle detail
 * page), so every entry into a new raffle re-surfaces the gate —
 * courts look for explicit, contextual consent tied to the transaction.
 *
 * @returns Checkbox with legal acknowledgment label + inline error slot
 */
export function AccessPassAcknowledgment() {
	// useId — stable, unique for label/input/error association across SSR.
	const checkboxId = useId();
	const errorId = useId();
	const wrapperRef = useRef<HTMLDivElement | null>(null);

	const isAcknowledged = useTicketQuantityStore(
		state => state.isAccessPassAcknowledged,
	);
	const setAcknowledged = useTicketQuantityStore(
		state => state.setAccessPassAcknowledged,
	);
	const acknowledgmentError = useTicketQuantityStore(
		state => state.acknowledgmentError,
	);
	const scrollNonce = useTicketQuantityStore(
		state => state.acknowledgmentScrollNonce,
	);

	// Mount + nonce-driven scroll: bridges the "user tapped the sticky CTA
	// without ticking the box" event from a distant subtree into a viewport
	// move here. Nonce (not boolean) so repeat taps re-trigger the scroll
	// on mobile where the user may have scrolled away since the prior bump.
	// Skips the initial mount (nonce starts at 0) so we don't yank the
	// page on first render.
	useEffect(() => {
		if (scrollNonce === 0) return;
		wrapperRef.current?.scrollIntoView({
			behavior: 'smooth',
			block: 'center',
		});
	}, [scrollNonce]);

	function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
		setAcknowledged(event.target.checked);
	}

	return (
		<div ref={wrapperRef} className="flex flex-col gap-1">
			<div className="flex items-start gap-2">
				<input
					id={checkboxId}
					type="checkbox"
					checked={isAcknowledged}
					onChange={handleChange}
					className={cn(
						'mt-0.5 size-4 shrink-0 cursor-pointer rounded border-gray-300',
						acknowledgmentError ? 'border-red-500 ring-1 ring-red-500' : '',
					)}
					aria-required="true"
					aria-invalid={acknowledgmentError}
					aria-describedby={acknowledgmentError ? errorId : undefined}
				/>
				<label
					htmlFor={checkboxId}
					className="text-ink-700 cursor-pointer text-xs/relaxed"
				>
					I confirm I&apos;m 18+ and agree to the{' '}
					<Link href="/terms" className="underline">
						Terms
					</Link>
					. I understand no purchase is necessary to enter or win — a free entry
					with identical odds is available at{' '}
					<Link href="/free-entry" className="underline">
						/free-entry
					</Link>
					.
				</label>
			</div>
			{/* Form-style inline error — concise copy, paired with `aria-invalid`
			    + `aria-describedby` above for SR users. Matches the project's
			    `text-sm text-red-500` field-error pattern (see
			    my-raffles/shared/*-fieldset). Lives in a fixed-height slot only
			    when active so we don't reflow the surrounding CTA stack. */}
			{acknowledgmentError ? (
				<span id={errorId} role="alert" className="pl-6 text-sm text-red-500">
					Please confirm the terms to continue.
				</span>
			) : null}
		</div>
	);
}
