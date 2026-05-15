'use client';

import { HandCoins } from 'lucide-react';

import {
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils/format/format-currency';

interface PaymentModalHeaderProps {
	readonly total: number;
	readonly currency: string;
	/** Pre-built "Nx entry · {raffleTitle}" caption — `null` when the
	 *  raffle title isn't hydrated so the caption row collapses cleanly. */
	readonly entryCaption: string | null;
}

/**
 * Header cluster for `PaymentMethodModal` — emblem, title, reassurance
 * line, and the prominent Total amount with the entry caption.
 *
 * Extracted into its own file to keep `payment-method-modal.tsx` under
 * the "split past ~200 lines" architecture budget. No internal state
 * lives here — the parent owns total + caption derivation.
 *
 * @returns Centered header column rendered inside the dialog
 */
export function PaymentModalHeader({
	total,
	currency,
	entryCaption,
}: PaymentModalHeaderProps) {
	return (
		<DialogHeader className="flex flex-col items-center gap-6">
			<HandCoins
				className="text-brand-dark size-20"
				strokeWidth={2}
				aria-hidden
			/>
			<div className="flex flex-col items-center gap-1.5">
				<DialogTitle className="font-clash-display text-brand-dark text-center text-3xl tracking-tight lg:text-4xl">
					Select payment method
				</DialogTitle>
				<DialogDescription className="text-ink-300 text-center text-sm">
					Refunded automatically if the sweepstake is cancelled.
				</DialogDescription>
			</div>
			<div className="flex flex-col items-center gap-0.5 py-3.5">
				<p className="text-ink-300 text-3xs font-semibold tracking-wider uppercase">
					Total
				</p>
				<p className="font-clash-display text-brand-dark text-4xl font-semibold tracking-tight">
					{formatCurrency(total, currency)}
				</p>
				{entryCaption ? (
					<p className="text-ink-300 text-3xs font-semibold tracking-wider">
						{entryCaption}
					</p>
				) : null}
			</div>
		</DialogHeader>
	);
}
