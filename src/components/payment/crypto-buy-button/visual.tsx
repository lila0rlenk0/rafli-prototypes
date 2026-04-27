'use client';

import { Loader2Icon, WalletIcon } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';

import type { IconComponentProps } from '@web3icons/react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/class-names';
import { CHAIN_ICONS } from '@/lib/web3/format/chain-icons';
import type { RaffleCryptoOptions } from '@/types/raffle';

import type { CryptoBuyButtonUiState } from './state';

interface CryptoBuyButtonVisualProps {
	state: CryptoBuyButtonUiState;
	isConnecting: boolean;
	onClick: () => void;
	/**
	 * Chains this raffle accepts — used to render the branded SVG stack on
	 * the button's leading edge so the CTA visually advertises the chains
	 * up front (no hover, no second click). The icon set is source-of-truth
	 * keyed by `chainId` in `CHAIN_ICONS`; unknown IDs are silently skipped.
	 */
	chains: RaffleCryptoOptions['chains'];
}

// Cap the chain icon stack so the CTA never overflows its width on
// narrow viewports — three overlapped glyphs are enough to signal
// "multiple networks" without crowding the label.
const MAX_STACKED_CHAIN_ICONS = 3;

/**
 * Picks the leading icon block. Three states, in precedence order:
 *   1. Loading spinner — tx confirming or wallet connecting.
 *   2. Stacked chain icons — idle state, conveys accepted networks.
 *   3. Wallet fallback — no recognizable chain IDs (shouldn't happen
 *      given upstream filtering, but keeps the button visually
 *      balanced if `CHAIN_ICONS` ever drifts behind the supported set).
 */
function getButtonIcon(options: {
	showLoadingIcon: boolean;
	chains: RaffleCryptoOptions['chains'];
}): ReactNode {
	if (options.showLoadingIcon) {
		return <Loader2Icon className="mr-2 size-4 animate-spin" />;
	}
	const iconComponents = options.chains
		.map(chain => CHAIN_ICONS[chain.chainId])
		.filter(
			(icon): icon is ComponentType<IconComponentProps> => icon !== undefined,
		)
		.slice(0, MAX_STACKED_CHAIN_ICONS);
	if (iconComponents.length === 0) {
		return <WalletIcon className="mr-2 size-4" aria-hidden="true" />;
	}
	return (
		<span className="mr-2 flex [&>*:not(:first-child)]:-ml-0.5">
			{iconComponents.map((Icon, index) => (
				<Icon
					key={index}
					size={20}
					variant="branded"
					className="rounded-full ring-2 ring-white"
					aria-hidden="true"
				/>
			))}
		</span>
	);
}

/**
 * Button class by variant — amber border when confirming to draw the
 * eye to a pending transaction; muted grey for both `preparing` (wallet
 * SDK loading) and `needs-acknowledgment` (consent box not ticked) so
 * both non-actionable states share the same visual affordance.
 */
function getButtonClass(variant: CryptoBuyButtonUiState['variant']): string {
	const base = 'h-12 w-full cursor-pointer border-2';
	if (variant === 'confirming') {
		return cn(
			base,
			'border-amber-500 bg-amber-50 text-amber-700 hover:bg-amber-100',
		);
	}
	if (variant === 'preparing' || variant === 'needs-acknowledgment') {
		return cn(
			base,
			'cursor-not-allowed border-ink-300 bg-ink-100 text-ink-500 hover:bg-ink-100 hover:text-ink-500',
		);
	}
	return cn(
		base,
		'border-black bg-white text-black hover:bg-black hover:text-white',
	);
}

/**
 * Presentational wrapper for the crypto CTA button. Chooses icon + class
 * from the UI-state union so the owning component can stay focused on
 * wallet / modal orchestration.
 */
export function CryptoBuyButtonVisual({
	state,
	isConnecting,
	onClick,
	chains,
}: CryptoBuyButtonVisualProps) {
	return (
		<Button
			onClick={onClick}
			disabled={state.isDisabled || isConnecting}
			variant="outline"
			className={getButtonClass(state.variant)}
		>
			{getButtonIcon({ showLoadingIcon: state.showLoadingIcon, chains })}
			<p className="font-semibold">{state.label}</p>
		</Button>
	);
}
