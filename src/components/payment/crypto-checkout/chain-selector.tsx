'use client';

import { getChainName } from '@/lib/web3/block-explorers';
import { CHAIN_ICONS } from '@/lib/web3/chain-icons';
import type { CryptoChainConfig } from '@/types/crypto-config';
import type { RaffleCryptoOptions } from '@/types/raffle';

// ==========================================
// Types
// ==========================================

interface ChainSelectorProps {
	/** Chain IDs to display — already resolved and filtered by parent */
	cryptoChainIds: number[];
	/** Raffle crypto options — pre-computed tokens per chain */
	cryptoOptions: RaffleCryptoOptions;
	/** Chain configs from crypto config endpoint */
	chains: CryptoChainConfig[];
	onSelectChain: (chainId: number) => void;
}

// ==========================================
// Component
// ==========================================

/**
 * Chain selector step for crypto checkout.
 * Displays supported chains with icons from CHAIN_ICONS map.
 * Token labels are dynamically resolved from the token registry —
 * shows available tokens per chain (e.g. "USDC · USDT" or "USDC · USDT · EARNM").
 */
export function ChainSelector({
	cryptoChainIds,
	cryptoOptions,
	chains,
	onSelectChain,
}: ChainSelectorProps) {
	/**
	 * Gets dot-separated token labels for a chain from raffle's pre-computed options.
	 * Backend already filtered by allowlist and pricing — no client-side logic needed.
	 */
	function getTokenLabels(chainId: number): string {
		const chainOption = cryptoOptions.chains.find(c => c.chainId === chainId);
		if (!chainOption || chainOption.tokens.length === 0) return 'USDC';
		return chainOption.tokens.map(t => t.label).join(' · ');
	}

	return (
		<div className="flex flex-col gap-3">
			<p className="text-sm text-[#7B7B7B]">Choose which network to pay on</p>
			{cryptoChainIds.map(chainId => {
				const icon = CHAIN_ICONS[chainId];

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
									{/* eslint-disable-next-line @next/next/no-img-element */}
									<img
										alt={getChainName(chainId, chains)}
										src={icon.iconUrl}
										className="size-4"
									/>
								</span>
							)}
							<span className="text-sm font-medium">
								{getChainName(chainId, chains)}
							</span>
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
