'use client';

import { Coins } from 'lucide-react';

import { EarnMCoin } from '@/assets/icons/earnm-coin';
import { SelectorOptionButton } from '@/components/payment/crypto-checkout/selectors/selector-option-button';
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
			<p className="text-ink-500 text-sm">Choose which token to pay with</p>
			{tokens.map(token => {
				const priceLabel = getPriceLabel(token);

				return (
					<SelectorOptionButton
						key={token.tokenId}
						label={token.symbol}
						leadingVisual={
							// EARNM uses a custom SVG — @web3icons doesn't recognize it.
							token.symbol === 'EARNM' ? (
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
							)
						}
						meta={priceLabel}
						onClick={() => onSelectToken(token)}
					/>
				);
			})}
		</div>
	);
}
