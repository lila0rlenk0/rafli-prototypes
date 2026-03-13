'use client';

import { CHAIN_ICONS } from '@/lib/web3/chain-icons';
import { CHAIN_NAMES } from '@/lib/web3/chains';
import { getSelectableTokensForChain } from '@/lib/web3/tokens';

// ==========================================
// Types
// ==========================================

interface ChainSelectorProps {
	/** Chain IDs to display — already resolved (empty = all) and filtered by parent */
	cryptoChainIds: number[];
	/** Allowed token slugs — empty means all. Used to show accurate token labels per chain. */
	cryptoTokens?: string[];
	/** Non-stablecoin pricing entries present on the raffle */
	pricedTokenSlugs?: string[];
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
	cryptoTokens = [],
	pricedTokenSlugs = [],
	onSelectChain,
}: ChainSelectorProps) {
	/**
	 * Gets dot-separated token labels for a chain, filtered by raffle allowlist.
	 * Shown as secondary text on each chain button.
	 */
	function getTokenLabels(chainId: number): string {
		const allowed = getSelectableTokensForChain(chainId, {
			allowedTokenSlugs: cryptoTokens,
			pricedTokenSlugs,
		});
		if (allowed.length === 0) return 'USDC';
		return allowed.map(t => t.label).join(' · ');
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
										alt={CHAIN_NAMES[chainId] ?? ''}
										src={icon.iconUrl}
										className="size-4"
									/>
								</span>
							)}
							<span className="text-sm font-medium">
								{CHAIN_NAMES[chainId] ?? `Chain ${chainId}`}
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
