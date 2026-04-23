import { throwUnexpectedCase } from '@/components/payment/crypto-checkout/recovery/throw-unexpected';

// ==========================================
// Constants
// ==========================================

/** Total steps when token selection is shown (multi-token chain) */
export const TOTAL_STEPS_WITH_TOKEN = 4;

/** Total steps when token selection is auto-skipped (single-token chain) */
export const TOTAL_STEPS_WITHOUT_TOKEN = 3;

// ==========================================
// Types
// ==========================================

export type CheckoutStep =
	| 'select-chain'
	| 'select-token'
	| 'connect-wallet'
	| 'review'
	| 'confirming'
	| 'success'
	| 'failure';

// ==========================================
// Pure helpers
// ==========================================

/**
 * Returns the dialog title for a given step.
 *
 * Handles the "Crypto Unavailable" variant when no selectable chain
 * survives the FE runtime filter.
 *
 * @param step - Current checkout step
 * @param hasSelectableChains - Whether at least one chain is renderable
 * @returns Human-readable title for the dialog header
 */
export function getCheckoutStepTitle(
	step: CheckoutStep,
	options: { hasSelectableChains: boolean },
): string {
	const { hasSelectableChains } = options;
	switch (step) {
		case 'select-chain':
			return hasSelectableChains ? 'Select Network' : 'Crypto Unavailable';
		case 'select-token':
			return 'Select Token';
		case 'connect-wallet':
			return 'Connect Wallet';
		case 'review':
			return 'Review & Pay';
		case 'confirming':
			return 'Confirming';
		case 'success':
			return 'Payment Complete';
		case 'failure':
			return 'Payment Failed';
		default:
			return throwUnexpectedCase(step, 'getCheckoutStepTitle');
	}
}

/**
 * Whether the token step was (or would be) shown for the selected chain.
 *
 * Drives the progress-dot count: single-token chains auto-skip the token
 * step, so the flow shows 3 dots instead of 4.
 *
 * @param selectedChainId - Currently selected chain, null before selection
 * @param tokenCountForChain - Token count available for the selected chain
 * @returns True iff the chain has more than one allowed token
 */
export function wasTokenStepShown(
	selectedChainId: number | null,
	tokenCountForChain: number,
): boolean {
	if (!selectedChainId) return false;
	return tokenCountForChain > 1;
}

/**
 * Maps the current step to its 1-based index. Terminal steps (confirming,
 * success, failure) and the unavailable-chain variant return 0 so the
 * header hides the progress dots.
 *
 * @param step - Current checkout step
 * @param tokenShown - Result of `wasTokenStepShown(...)`
 * @param hasSelectableChains - Whether any chain is selectable
 * @returns Step index or 0 when progress dots should be hidden
 */
export function getStepNumber(
	step: CheckoutStep,
	options: { tokenStepShown: boolean; hasSelectableChains: boolean },
): number {
	const { tokenStepShown: tokenShown, hasSelectableChains } = options;
	if (step === 'select-chain' && !hasSelectableChains) return 0;
	switch (step) {
		case 'select-chain':
			return 1;
		case 'select-token':
			return 2;
		case 'connect-wallet':
			return tokenShown ? 3 : 2;
		case 'review':
			return tokenShown ? 4 : 3;
		case 'confirming':
		case 'success':
		case 'failure':
			return 0;
		default:
			return throwUnexpectedCase(step, 'getStepNumber');
	}
}

/**
 * Total step count — drives how many progress dots render.
 *
 * @param options.tokenStepShown - Result of `wasTokenStepShown(...)`
 * @returns 4 when the token step is shown, 3 when auto-skipped
 */
export function getTotalSteps(options: { tokenStepShown: boolean }): number {
	const { tokenStepShown } = options;
	return tokenStepShown ? TOTAL_STEPS_WITH_TOKEN : TOTAL_STEPS_WITHOUT_TOKEN;
}
