'use client';

import { SelectorOptionButton } from '@/components/payment/crypto-checkout/selector-option-button';
import { CHAIN_ICONS } from '@/lib/web3/chain-icons';
import type { RaffleCryptoOptions } from '@/types/raffle';

interface ChainSelectorProps {
	/** Chain IDs to display — already resolved and filtered by parent */
	cryptoChainIds: number[];
	/** Raffle crypto options — pre-computed tokens and chain names from backend */
	cryptoOptions: RaffleCryptoOptions;
	onSelectChain: (chainId: number) => void;
}

/**
 * Chain selector step for crypto checkout.
 * Chain names and token labels come from raffle's cryptoOptions (backend-resolved).
 */
export function ChainSelector({
	cryptoChainIds,
	cryptoOptions,
	onSelectChain,
}: ChainSelectorProps) {
	function getChainOption(chainId: number) {
		return cryptoOptions.chains.find(c => c.chainId === chainId);
	}

	function getChainName(chainId: number): string {
		return getChainOption(chainId)?.name ?? `Chain ${chainId}`;
	}

	// Backend already filtered by allowlist and pricing — no client-side logic needed
	function getTokenLabels(chainId: number): string {
		const chainOption = getChainOption(chainId);
		if (!chainOption || chainOption.tokens.length === 0) return 'USDC';
		return chainOption.tokens.map(t => t.symbol).join(' · ');
	}

	return (
		<div className="flex flex-col gap-3">
			<p className="text-sm text-[#7B7B7B]">Choose which network to pay on</p>
			{cryptoChainIds.map(chainId => {
				const ChainIcon = CHAIN_ICONS[chainId];
				const chainName = getChainName(chainId);

				return (
					<SelectorOptionButton
						key={chainId}
						label={chainName}
						leadingVisual={
							ChainIcon ? (
								<ChainIcon variant="branded" size={24} className="shrink-0" />
							) : undefined
						}
						meta={getTokenLabels(chainId)}
						onClick={() => onSelectChain(chainId)}
					/>
				);
			})}
		</div>
	);
}
