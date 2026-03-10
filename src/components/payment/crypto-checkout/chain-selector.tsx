'use client';

import { CHAIN_ICONS } from '@/lib/web3/chain-icons';
import { CHAIN_NAMES } from '@/types/wallet';

// ==========================================
// Types
// ==========================================

interface ChainSelectorProps {
	cryptoChainIds: number[];
	onSelectChain: (chainId: number) => void;
}

// ==========================================
// Component
// ==========================================

/**
 * Chain selector step for crypto checkout.
 * Displays supported chains with icons from CHAIN_ICONS map.
 * RainbowKit only exposes icons for the connected chain —
 * we use static SVG data URIs for all chains in the selector.
 */
export function ChainSelector({
	cryptoChainIds,
	onSelectChain,
}: ChainSelectorProps) {
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
							USDC
						</span>
					</button>
				);
			})}
		</div>
	);
}
