import { useCallback } from 'react';

import {
	CLOSE_ANIMATION_MS,
	type UseCheckoutActionsParams,
} from '@/components/payment/crypto-checkout/use-checkout-actions-params';
import { tokensForChain } from '@/components/payment/crypto-checkout/hooks/use-checkout-actions-tokens';

export function useResetCloseBack(params: UseCheckoutActionsParams) {
	const handleReset = useCallback(() => runHandleReset(params), [params]);
	const handleClose = useCallback(
		() => runHandleClose(params, handleReset),
		[params, handleReset],
	);
	const handleBack = useCallback(() => runHandleBack(params), [params]);
	return { handleReset, handleClose, handleBack };
}

function runHandleReset(p: UseCheckoutActionsParams): void {
	p.guards.clearCloseReset();
	p.guards.invalidatePreConfirmingFlow();
	p.goToStep('select-chain');
	p.session.resetSession();
	p.setIsProcessing(false);
	p.setErrorMessage(null);
	p.setFundsAtRisk(false);
	p.tx.resetTracking();
	p.fe.resetConfirmation();
	p.guards.releaseInFlightGuards();
	p.resetSendTransaction();
}

function runHandleClose(p: UseCheckoutActionsParams, reset: () => void): void {
	p.onOpenChange(false);
	if (p.step === 'confirming') return;
	p.guards.invalidatePreConfirmingFlow();
	const sessionData = p.session.session;
	if (sessionData?.orderId && !p.fundsAtRisk && !p.retryBlocked) {
		p.abandonOrder(sessionData.orderId, 'crypto').catch(() => {});
	}
	p.guards.scheduleCloseReset(CLOSE_ANIMATION_MS, reset);
}

function runHandleBack(p: UseCheckoutActionsParams): void {
	switch (p.step) {
		case 'select-token':
			p.session.setSelectedChainId(null);
			p.session.setSelectedToken(null);
			p.goToStep('select-chain');
			return;
		case 'connect-wallet': {
			const chainId = p.session.selectedChainId;
			if (chainId && tokensForChain(p.cryptoOptions, chainId).length > 1) {
				p.session.setSelectedToken(null);
				p.goToStep('select-token');
				return;
			}
			p.session.setSelectedChainId(null);
			p.session.setSelectedToken(null);
			p.goToStep('select-chain');
			return;
		}
		case 'review':
			p.goToStep('connect-wallet');
			return;
		default:
			return;
	}
}
