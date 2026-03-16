'use client';

import { CHAIN_ICONS } from '@/lib/web3/chain-icons';
import type { RaffleCryptoOptions } from '@/types/raffle';

// ==========================================
// Types
// ==========================================

interface ChainSelectorProps {
	/** Chain IDs to display — already resolved and filtered by parent */
	cryptoChainIds: number[];
	/** Raffle crypto options — pre-computed tokens and chain names from backend */
	cryptoOptions: RaffleCryptoOptions;
	onSelectChain: (chainId: number) => void;
}

// ==========================================
// Component
// ==========================================

/**
 * Chain selector step for crypto checkout.
 * Displays supported chains with icons from CHAIN_ICONS map.
 * Chain names and token labels come from raffle's cryptoOptions (backend-resolved).
 */
export function ChainSelector({
	cryptoChainIds,
	cryptoOptions,
	onSelectChain,
}: ChainSelectorProps) {
	/** Finds the chain entry from raffle's crypto options */
	function getChainOption(chainId: number) {
		return cryptoOptions.chains.find(c => c.chainId === chainId);
	}

	/** Gets chain display name from raffle's crypto options, falls back to chain ID */
	function getChainName(chainId: number): string {
		return getChainOption(chainId)?.name ?? `Chain ${chainId}`;
	}

	/**
	 * Gets dot-separated token symbols for a chain.
	 * Backend already filtered by allowlist and pricing — no client-side logic needed.
	 */
	function getTokenLabels(chainId: number): string {
		const chainOption = getChainOption(chainId);
		if (!chainOption || chainOption.tokens.length === 0) return 'USDC';
		return chainOption.tokens.map(t => t.symbol).join(' · ');
	}

	return (
		<div className="flex flex-col gap-3">
			<p className="text-sm text-[#7B7B7B]">Choose which network to pay on</p>
			{cryptoChainIds.map(chainId => {
				const icon = CHAIN_ICONS[chainId];
				const chainName = getChainName(chainId);

				return (
					<button
						key={chainId}
						type="button"
						className="group flex h-14 items-center justify-between rounded-2xl border border-[#E5E5E5] bg-white px-5 text-left transition-all hover:border-black hover:shadow-sm"
						onClick={() => onSelectChain(chainId)}
					>
						<span className="flex items-center gap-3">
							{icon && (
								<span
									className="flex size-6 items-center justify-center overflow-hidden rounded-full"
									style={{ background: icon.iconBackground }}
								>
									<icon.icon className="size-4" />
								</span>
							)}
							<span className="text-sm font-medium">{chainName}</span>
						</span>
						<span className="text-xs text-[#7B7B7B] transition-colors group-hover:text-black">
							{getTokenLabels(chainId)}
						</span>
					</button>
				);
			})}
		</div>
	);
}
