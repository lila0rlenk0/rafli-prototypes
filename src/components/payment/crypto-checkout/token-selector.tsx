'use client';

import { Coins } from 'lucide-react';

import { EarnMCoin } from '@/assets/icons/earnm-coin';
import { TokenIcon } from '@web3icons/react/dynamic';

import type { RaffleCryptoToken } from '@/types/raffle';

interface TokenSelectorProps {
	tokens: RaffleCryptoToken[];
	onSelectToken: (token: RaffleCryptoToken) => void;
}

/**
 * Token selector step for crypto checkout.
 * Shown after chain selection when multiple tokens are available.
 * Auto-skipped by parent when only one token exists.
 */
export function TokenSelector({ tokens, onSelectToken }: TokenSelectorProps) {
	// null price = stablecoin (1:1 USD peg); non-null = explicit per-ticket rate
	function getPriceLabel(token: RaffleCryptoToken): string {
		if (!token.price) return '1:1 USD';
		return `${token.price} ${token.symbol}/ticket`;
	}

	return (
		<div className="flex flex-col gap-3">
			<p className="text-sm text-[#7B7B7B]">Choose which token to pay with</p>
			{tokens.map(token => {
				const priceLabel = getPriceLabel(token);

				return (
					<button
						key={token.tokenId}
						type="button"
						className="group flex h-14 items-center justify-between rounded-2xl border border-[#E5E5E5] bg-white px-5 text-left transition-all hover:border-black hover:shadow-sm"
						onClick={() => onSelectToken(token)}
					>
						<span className="flex items-center gap-3">
							{/* EARNM uses a custom SVG — @web3icons doesn't recognize it */}
							{token.symbol === 'EARNM' ? (
								<EarnMCoin className="size-6 shrink-0" />
							) : (
								<TokenIcon
									symbol={token.symbol}
									variant="branded"
									size={24}
									className="shrink-0"
									fallback={
										<span className="flex size-6 items-center justify-center rounded-full bg-gray-100">
											<Coins className="size-3.5 text-gray-500" />
										</span>
									}
								/>
							)}
							<span className="text-sm font-medium">{token.symbol}</span>
						</span>
						<span className="text-xs text-[#7B7B7B] transition-colors group-hover:text-black">
							{priceLabel}
						</span>
					</button>
				);
			})}
		</div>
	);
}
