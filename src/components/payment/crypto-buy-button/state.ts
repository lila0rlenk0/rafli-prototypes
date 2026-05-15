interface GetCryptoBuyButtonUiStateParams {
	isConfirming: boolean;
	isConnected: boolean;
	canOpenConnectModal: boolean;
	disabled: boolean;
}

type CryptoBuyButtonUiVariant =
	| 'confirming'
	| 'preparing'
	| 'ready-to-connect'
	| 'connected';

export interface CryptoBuyButtonUiState {
	label: string;
	showLoadingIcon: boolean;
	isDisabled: boolean;
	variant: CryptoBuyButtonUiVariant;
}

/**
 * Resolves CTA copy and disabled/loading state for the crypto buy button.
 *
 * Keeps the component render branch-free and centralizes wallet-modal
 * readiness behavior in one deterministic mapping. The Access Pass
 * acknowledgment gate that previously lived here moved upstream to the
 * "One Time Purchase" trigger — by the time the picker is open this
 * button no longer needs to enforce it.
 */
export function getCryptoBuyButtonUiState({
	isConfirming,
	isConnected,
	canOpenConnectModal,
	disabled,
}: GetCryptoBuyButtonUiStateParams): CryptoBuyButtonUiState {
	// Tender-only label — the picker's Total row prints the order amount
	// once at the top of the modal, so the per-tender buttons stay short
	// instead of repeating `$X` three times across Card / Credits / Crypto.
	const purchaseLabel = 'Pay with Crypto';
	// Step 1: In-flight transaction dominates every other concern — once the
	// wallet signs, the user has already consented and the chain controls the
	// outcome.
	if (isConfirming) {
		return {
			label: 'Transaction pending...',
			showLoadingIcon: true,
			isDisabled: false,
			variant: 'confirming',
		};
	}

	// Step 2: Preparing is wallet-SDK readiness, not user intent.
	if (!isConnected && !canOpenConnectModal) {
		return {
			label: 'Preparing wallet...',
			showLoadingIcon: true,
			isDisabled: true,
			variant: 'preparing',
		};
	}

	// Crypto uses the same visible label before and after wallet connection.
	// The click behavior can still open the wallet modal, but the action text
	// stays on the canonical tender label instead of switching copy mid-flow.
	if (!isConnected) {
		return {
			label: purchaseLabel,
			showLoadingIcon: false,
			isDisabled: disabled,
			variant: 'ready-to-connect',
		};
	}

	return {
		label: purchaseLabel,
		showLoadingIcon: false,
		isDisabled: disabled,
		variant: 'connected',
	};
}
