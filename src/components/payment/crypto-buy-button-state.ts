interface GetCryptoBuyButtonUiStateParams {
	isConfirming: boolean;
	isConnected: boolean;
	canOpenConnectModal: boolean;
	disabled: boolean;
	/**
	 * Whether the user has acknowledged the Access Pass disclaimer. Paid
	 * checkout is blocked until true. Bypassed only for `confirming` and
	 * `preparing` variants — see state-machine test for rationale.
	 */
	isAccessPassAcknowledged: boolean;
}

type CryptoBuyButtonUiVariant =
	| 'confirming'
	| 'preparing'
	| 'needs-acknowledgment'
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
	isAccessPassAcknowledged,
}: GetCryptoBuyButtonUiStateParams): CryptoBuyButtonUiState {
	// Step 1: In-flight transaction dominates every other concern — once the
	// wallet signs, the user has already consented and the chain controls the
	// outcome. Gating this view on the acknowledgment checkbox would strand
	// the user mid-confirm.
	if (isConfirming) {
		return {
			label: 'Transaction pending...',
			showLoadingIcon: true,
			isDisabled: false,
			variant: 'confirming',
		};
	}

	// Step 2: Preparing is wallet-SDK readiness, not user intent. The
	// acknowledgment gate only matters when the button is interactive, so
	// preparing precedes the consent check.
	if (!isConnected && !canOpenConnectModal) {
		return {
			label: 'Preparing wallet...',
			showLoadingIcon: true,
			isDisabled: true,
			variant: 'preparing',
		};
	}

	// Step 3: Consent gate — the button is interactive from here on, so the
	// user must tick the Access Pass acknowledgment in the purchase card
	// before any click-through is allowed. Distinct variant + actionable
	// label so the user knows the fix ("tick the checkbox above") instead of
	// being left to guess why the button is greyed out.
	if (!isAccessPassAcknowledged) {
		return {
			label: 'Acknowledge terms to continue',
			showLoadingIcon: false,
			isDisabled: true,
			variant: 'needs-acknowledgment',
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
