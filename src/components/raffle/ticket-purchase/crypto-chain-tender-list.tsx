'use client';

import { cn } from '@/lib/class-names';
import { CHAIN_ICONS } from '@/lib/web3/format/chain-icons';
import type { RaffleCryptoOptions } from '@/types/raffle';

interface CryptoChainTenderListProps {
	readonly cryptoOptions: RaffleCryptoOptions;
}

/**
 * Grouped, inline summary of selectable crypto chains rendered below the
 * Crypto tender row in `PaymentMethodModal`. Mirrors the layout the
 * crypto-checkout `ChainSelector` uses (chain icon + chain name + token
 * symbols), condensed into a stacked pill-list so the picker can preview
 * what networks the raffle accepts without the user opening the full
 * crypto-checkout modal first.
 *
 * Intentionally non-interactive: the Crypto row above is the click target
 * that hands off to the existing crypto flow, where the user picks the
 * final chain + token. Wiring chain pre-selection through `CryptoBuyButton`
 * → `CryptoCheckoutModal` is a follow-up; today these rows are a teaching
 * surface, not a tap-to-pay shortcut, so they stay informational `<div>`s
 * rather than buttons that fire the same action three times in a row.
 *
 * @returns Stacked chain summary card
 */
export function CryptoChainTenderList({
	cryptoOptions,
}: CryptoChainTenderListProps) {
	return (
		<div className="bg-ink-150 rounded-tender-pill flex w-full flex-col px-4 py-1">
			{cryptoOptions.chains.map((chain, index) => {
				const ChainIcon = CHAIN_ICONS[chain.chainId];
				const tokenSummary =
					chain.tokens.length > 0
						? chain.tokens.map(t => t.symbol).join(' · ')
						: 'USDC';

				return (
					<div
						key={chain.chainId}
						// First row sits flush with the container padding;
						// subsequent rows carry a hairline top border so the list
						// reads as a grouped breakdown rather than disconnected
						// pills. Pattern follows the mockup's stacked-card layout.
						className={cn(
							'flex items-center justify-between py-2.5',
							// Subsequent rows carry a hairline top border so the list
							// reads as a grouped breakdown rather than disconnected
							// pills — pattern follows the figma's stacked-card layout.
							// `ink-300` (#b4b4b4) matches the figma gray/11 divider.
							index > 0 && 'border-ink-300 border-t',
						)}
					>
						<div className="flex items-center gap-2">
							{ChainIcon ? (
								<ChainIcon variant="branded" size={20} className="shrink-0" />
							) : null}
							<div className="flex flex-col gap-0.5">
								<span className="text-brand-dark text-xs font-medium">
									{chain.name}
								</span>
								<span className="text-ink-500 text-xs">{tokenSummary}</span>
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
}
