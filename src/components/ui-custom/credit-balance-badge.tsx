'use client';

import { Wallet } from 'lucide-react';
import Link from 'next/link';

import { useCreditBalance } from '@/services/payment/use-credit-balance';

/**
 * CreditBalanceBadge Component
 *
 * Small pill in the navbar showing the user's available credit balance.
 * Hidden when balance is zero or fetch fails.
 * Links to the profile credits section on click.
 *
 * Uses the shared React Query cache so balance updates automatically
 * when any payment flow invalidates ['credits'].
 *
 * @returns Credit balance pill or null
 */
export function CreditBalanceBadge() {
	const { data } = useCreditBalance();

	// Always show — even $0 so the user knows they have no credits (not a hidden surprise)
	const amount = data ? parseFloat(data.availableAmount) : 0;

	const formatted = new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	}).format(amount);

	return (
		// Badge, not a button — soft background distinguishes it from action buttons in the navbar.
		// h-[38px] aligns with the "Help us improve" button for vertical rhythm.
		<Link
			href="/profile#credits"
			className="flex h-[38px] items-center gap-1.5 rounded-full bg-[#F4F4F4] px-4 text-sm font-medium text-black"
			title="Your credit balance"
		>
			<Wallet className="size-3.5" />
			<span>{formatted}</span>
		</Link>
	);
}
