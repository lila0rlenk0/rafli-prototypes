import { Coins, Lock } from 'lucide-react';

import { HUB_CREDITS_COUNT } from './hub-content';

interface CreditsBadgeProps {
	/** Locked (guest) renders a muted "Credits locked" pill instead. */
	readonly locked?: boolean;
	/** Credit count shown when unlocked. */
	readonly count?: number;
}

/**
 * Hero credit block — a compact card showing the user's credit balance,
 * sat opposite the page title. The locked variant is used in the guest view
 * where the visitor has no credits yet.
 *
 * @param locked - Render the locked (guest) state
 * @param count - Credit count for the unlocked state
 * @returns The credits badge
 */
export function CreditsBadge({
	locked = false,
	count = HUB_CREDITS_COUNT,
}: CreditsBadgeProps) {
	if (locked) {
		return (
			<div className="text-ink-500 flex items-center gap-3 rounded-2xl border border-black/10 bg-black/5 px-6 py-4">
				<Lock className="size-6" />
				<span className="text-base font-semibold">Credits locked</span>
			</div>
		);
	}

	return (
		<div className="bg-brand-yellow flex items-center gap-3.5 rounded-2xl border-2 border-black/10 px-6 py-4">
			<Coins className="text-ink-900 size-8" />
			<div className="flex flex-col leading-tight">
				<span className="text-ink-900 font-clash-display text-3xl font-semibold">
					{count} credits
				</span>
				<span className="text-ink-700 text-sm font-medium">ready to play</span>
			</div>
		</div>
	);
}
