'use client';

import { Coins } from 'lucide-react';

import type { RaffleCryptoToken } from '@/types/raffle';

// ==========================================
// Types
// ==========================================

interface TokenSelectorProps {
	tokens: RaffleCryptoToken[];
	onSelectToken: (token: RaffleCryptoToken) => void;
}

// ==========================================
// Component
// ==========================================

/**
 * Token selector step for crypto checkout.
 * Shown after chain selection when multiple tokens are available.
 * Auto-skipped by the parent modal when only one token exists.
 *
 * Stablecoins (pricePerTicket === null) show "1:1 USD".
 * Custom-priced tokens show the explicit per-ticket rate from crypto options.
 */
export function TokenSelector({ tokens, onSelectToken }: TokenSelectorProps) {
	/**
	 * Gets the display price label for a token.
	 * Null pricePerTicket = stablecoin (1:1 USD).
	 * Non-null = custom-priced token with explicit per-ticket rate.
	 */
	function getPriceLabel(token: RaffleCryptoToken): string | null {
		if (!token.pricePerTicket) return '1:1 USD';
		return `${token.pricePerTicket} ${token.label}/ticket`;
	}

	return (
		<div className="flex flex-col gap-3">
			<p className="text-sm text-[#7B7B7B]">Choose which token to pay with</p>
			{tokens.map(token => {
				const priceLabel = getPriceLabel(token);

				return (
					<button
						key={token.slug}
						type="button"
						className="group flex h-14 items-center justify-between rounded-2xl border border-[#E5E5E5] bg-white px-5 text-left transition-all hover:border-black hover:shadow-sm"
						onClick={() => onSelectToken(token)}
					>
						<span className="flex items-center gap-3">
							<span className="flex size-6 items-center justify-center rounded-full bg-gray-100">
								<Coins className="size-3.5 text-gray-500" />
							</span>
							<span className="text-sm font-medium">{token.label}</span>
						</span>
						{priceLabel && (
							<span className="text-xs text-[#7B7B7B] transition-colors group-hover:text-black">
								{priceLabel}
							</span>
						)}
					</button>
				);
			})}
		</div>
	);
}
