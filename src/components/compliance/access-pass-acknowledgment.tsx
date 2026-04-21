'use client';

import Link from 'next/link';
import { useId } from 'react';

import { useTicketQuantityStore } from '@/providers/ticket-quantity-store-provider';

/**
 * Required acknowledgment checkbox rendered above the buy CTA inside the
 * `TicketPurchaseCard`. Persists intent into the page-scoped
 * `TicketQuantityStore` so both the desktop `BuyButton` and the mobile
 * `StickyBuyTicketsCta` read the same `isAccessPassAcknowledged` flag and
 * disable themselves until it is true.
 *
 * Why store-backed instead of prop-drilled: the mobile sticky CTA lives in
 * a distant branch of the page tree (fixed-position at viewport bottom),
 * so a checkbox inside the inline card would have no clean prop path to
 * the sticky bar. The existing store already coordinates quantity + promo
 * across the two surfaces, so acknowledgment piggybacks on that contract
 * with zero new wiring.
 *
 * Why per-mount (not persisted): the consent is transient. Each raffle
 * visit creates a fresh store instance (provider is mounted on the raffle
 * detail page), so every entry into a new raffle re-surfaces the consent
 * gate — this is deliberate, courts look for explicit and contextual
 * consent tied to the specific transaction.
 *
 * @returns Checkbox with legal acknowledgment label
 */
export function AccessPassAcknowledgment() {
	// useId — stable, unique for label/input association; safe across SSR.
	const checkboxId = useId();
	const isAcknowledged = useTicketQuantityStore(
		state => state.isAccessPassAcknowledged,
	);
	const setAcknowledged = useTicketQuantityStore(
		state => state.setAccessPassAcknowledged,
	);

	function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
		setAcknowledged(event.target.checked);
	}

	return (
		<div className="flex items-start gap-2">
			<input
				id={checkboxId}
				type="checkbox"
				checked={isAcknowledged}
				onChange={handleChange}
				className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border-gray-300"
				aria-required="true"
			/>
			<label
				htmlFor={checkboxId}
				className="cursor-pointer text-xs leading-relaxed text-[#4A4A4A]"
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
	);
}
