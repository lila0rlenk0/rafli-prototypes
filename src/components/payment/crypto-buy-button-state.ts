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

interface CryptoBuyButtonUiState {
	label: string;
	showLoadingIcon: boolean;
	isDisabled: boolean;
	variant: CryptoBuyButtonUiVariant;
}

/**
 * Resolves CTA copy and disabled/loading state for the crypto buy button.
 *
 * This keeps the component render branch-free and centralizes wallet-modal
 * readiness behavior in one deterministic mapping.
 */
export function getCryptoBuyButtonUiState({
	isConfirming,
	isConnected,
	canOpenConnectModal,
	disabled,
}: GetCryptoBuyButtonUiStateParams): CryptoBuyButtonUiState {
	if (isConfirming) {
		return {
			label: 'Transaction pending...',
			showLoadingIcon: true,
			isDisabled: false,
			variant: 'confirming',
		};
	}

	if (!isConnected && !canOpenConnectModal) {
		return {
			label: 'Preparing wallet...',
			showLoadingIcon: true,
			isDisabled: true,
			variant: 'preparing',
		};
	}

	if (!isConnected) {
		return {
			label: 'Connect wallet to buy',
			showLoadingIcon: false,
			isDisabled: disabled,
			variant: 'ready-to-connect',
		};
	}

	return {
		label: 'Buy with crypto',
		showLoadingIcon: false,
		isDisabled: disabled,
		variant: 'connected',
	};
}
