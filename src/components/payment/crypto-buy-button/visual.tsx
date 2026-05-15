'use client';

import { Diamond } from 'lucide-react';

import {
	TenderRow,
	type TenderRowVariant,
} from '@/components/payment/tender-row';

import type { CryptoBuyButtonUiState } from './state';

interface CryptoBuyButtonVisualProps {
	state: CryptoBuyButtonUiState;
	isConnecting: boolean;
	isWalletConnected: boolean;
	onClick: () => void;
	/** Picker slot variant — set by the parent picker; defaults to outlined */
	variant?: TenderRowVariant;
}

/**
 * Resolves the row's speed badge from the wallet state. Two surfaces:
 * - "Pending" while a transaction is confirming on-chain — the
 *   `state.variant === 'confirming'` UI signal already triggers the
 *   row-level loading spinner via `isLoading`, but the badge stays as
 *   a textual cue so the user knows the wait is on-chain, not in-app.
 * - "~30 sec" otherwise — the canonical crypto settlement window
 *   communicated to users in product copy across the checkout funnel.
 */
function resolveBadge(state: CryptoBuyButtonUiState): string {
	if (state.variant === 'confirming') return 'Pending';
	return '~30 sec';
}

interface ResolveDescriptionParams {
	readonly state: CryptoBuyButtonUiState;
	readonly isWalletConnected: boolean;
}

/**
 * Resolves the row's description from the wallet state. Reads like
 * supporting context rather than a CTA — the row label ("Crypto")
 * carries the affordance, the description tells the user what'll
 * happen when they tap.
 */
function resolveDescription({
	state,
	isWalletConnected,
}: ResolveDescriptionParams): string {
	if (state.variant === 'preparing') return 'Preparing wallet';
	if (state.variant === 'confirming') return 'Transaction pending…';
	if (isWalletConnected) return 'Wallet connected';
	return 'Connect a wallet to pay';
}

/**
 * Presentational wrapper for the crypto CTA — now a `TenderRow` matching
 * the Card and Credits surfaces in the picker. The label stays the
 * canonical "Crypto" tender name; per-state nuance (preparing, pending
 * tx, wallet status) moves down into the description so the row layout
 * stays steady regardless of where in the flow the user lands.
 */
export function CryptoBuyButtonVisual({
	state,
	isConnecting,
	isWalletConnected,
	onClick,
	variant = 'unselected',
}: CryptoBuyButtonVisualProps) {
	return (
		<TenderRow
			variant={variant}
			icon={<Diamond className="size-4" aria-hidden />}
			label="Crypto"
			badge={resolveBadge(state)}
			description={resolveDescription({ state, isWalletConnected })}
			isLoading={state.showLoadingIcon || isConnecting}
			disabled={state.isDisabled}
			onClick={onClick}
		/>
	);
}
