'use client';

import { Coins } from 'lucide-react';

import type { TokenInfo } from '@/lib/web3/tokens';
import type { CryptoTokenPricing } from '@/types/raffle';

// ==========================================
// Types
// ==========================================

interface TokenSelectorProps {
	tokens: TokenInfo[];
	/** Non-stablecoin pricing from raffle — maps token slug to price per ticket */
	cryptoTokenPricing?: CryptoTokenPricing;
	onSelectToken: (token: TokenInfo) => void;
}

// ==========================================
// Component
// ==========================================

/**
 * Token selector step for crypto checkout.
 * Shown after chain selection when multiple tokens are available.
 * Auto-skipped by the parent modal when only one token exists.
 *
 * Stablecoins show "1:1 USD" — non-stablecoins show the per-ticket price
 * from the raffle's `cryptoTokenPricing` config.
 */
export function TokenSelector({
	tokens,
	cryptoTokenPricing = [],
	onSelectToken,
}: TokenSelectorProps) {
	/**
	 * Gets the display price label for a token.
	 * Stablecoins use implicit 1:1 USD pricing.
	 * Non-stablecoins look up the raffle's cryptoTokenPricing array.
	 */
	function getPriceLabel(token: TokenInfo): string | null {
		if (token.isStablecoin) return '1:1 USD';
		const pricing = cryptoTokenPricing.find(p => p.token === token.slug);
		if (!pricing) return null;
		return `${pricing.pricePerTicket} ${token.label}/ticket`;
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
