'use client';

import { Coins } from 'lucide-react';

import type { TokenInfo } from '@/lib/web3/tokens';

// ==========================================
// Types
// ==========================================

interface TokenSelectorProps {
	tokens: TokenInfo[];
	onSelectToken: (token: TokenInfo) => void;
}

// ==========================================
// Component
// ==========================================

/**
 * Token selector step for crypto checkout.
 * Shown after chain selection when multiple tokens are available.
 * Auto-skipped by the parent modal when only one token exists.
 */
export function TokenSelector({ tokens, onSelectToken }: TokenSelectorProps) {
	return (
		<div className="flex flex-col gap-3">
			<p className="text-sm text-[#7B7B7B]">Choose which token to pay with</p>
			{tokens.map(token => (
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
					{token.isStablecoin && (
						<span className="text-xs text-[#7B7B7B] transition-colors group-hover:text-black">
							1:1 USD
						</span>
					)}
				</button>
			))}
		</div>
	);
}
