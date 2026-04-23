'use client';

import { useHandlePay } from '@/components/payment/crypto-checkout/hooks/use-checkout-actions-pay';
import type { UseCheckoutActionsParams } from '@/components/payment/crypto-checkout/use-checkout-actions-params';
import { useResetCloseBack } from '@/components/payment/crypto-checkout/hooks/use-checkout-actions-reset-close-back';
import {
	useHandleSelectChain,
	useHandleSelectToken,
} from '@/components/payment/crypto-checkout/hooks/use-checkout-actions-select-chain-token';
import { tokensForChain } from '@/components/payment/crypto-checkout/hooks/use-checkout-actions-tokens';
import { useHandleWalletReady } from '@/components/payment/crypto-checkout/hooks/use-checkout-actions-wallet-ready';
import type {
	ReplacementReason,
	SubmitRecoveryMode,
} from '@/components/payment/crypto-checkout/hooks/use-tx-tracking';

export type { UseCheckoutActionsParams } from '@/components/payment/crypto-checkout/use-checkout-actions-params';

/**
 * Bundles every user-facing handler the modal needs: chain/token select,
 * wallet-ready bootstrap, pay, and the reset/close/back trio.
 *
 * Each handler preserves the pre-refactor behavior byte-for-byte — this
 * hook only re-homes the bodies off the modal so the parent stays under
 * the 150-LOC cap.
 *
 * @param params - Every reactive dependency the handlers close over
 * @returns Seven named handlers ready to wire into JSX
 */
export function useCheckoutActions(params: UseCheckoutActionsParams) {
	const handleSelectChain = useHandleSelectChain(params);
	const handleSelectToken = useHandleSelectToken(params);
	const handleWalletReady = useHandleWalletReady(params);
	const handlePay = useHandlePay(params);
	const { handleReset, handleClose, handleBack } = useResetCloseBack(params);
	return {
		handleSelectChain,
		handleSelectToken,
		handleWalletReady,
		handlePay,
		handleReset,
		handleClose,
		handleBack,
	};
}

export { tokensForChain };

export type { SubmitRecoveryMode, ReplacementReason };
