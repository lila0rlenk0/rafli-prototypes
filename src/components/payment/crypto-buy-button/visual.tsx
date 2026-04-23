'use client';

import { Loader2Icon, WalletIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/class-names';
import type { CryptoBuyButtonUiState } from './state';

interface CryptoBuyButtonVisualProps {
	state: CryptoBuyButtonUiState;
	isConnecting: boolean;
	onClick: () => void;
}

/**
 * Picks the leading icon for the CTA — spinner while a tx is confirming
 * or the wallet is connecting, otherwise a static wallet glyph.
 */
function getButtonIcon(options: { showLoadingIcon: boolean }): ReactNode {
	const { showLoadingIcon } = options;
	if (showLoadingIcon) {
		return <Loader2Icon className="mr-2 size-4 animate-spin" />;
	}
	return <WalletIcon className="mr-2 size-4" />;
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
}: CryptoBuyButtonVisualProps) {
	return (
		<Button
			onClick={onClick}
			disabled={state.isDisabled || isConnecting}
			variant="outline"
			className={getButtonClass(state.variant)}
		>
			{getButtonIcon({ showLoadingIcon: state.showLoadingIcon })}
			<p className="font-semibold">{state.label}</p>
		</Button>
	);
}
