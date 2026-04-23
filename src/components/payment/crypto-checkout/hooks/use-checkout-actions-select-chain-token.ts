import { useCallback } from 'react';

import { tokensForChain } from '@/components/payment/crypto-checkout/hooks/use-checkout-actions-tokens';
import type { UseCheckoutActionsParams } from '@/components/payment/crypto-checkout/use-checkout-actions-params';
import type { RaffleCryptoToken } from '@/types/raffle';

export function useHandleSelectChain(params: UseCheckoutActionsParams) {
	const { session, goToStep, cryptoOptions } = params;
	return useCallback(
		(chainId: number) => {
			session.setSelectedChainId(chainId);
			const tokens = tokensForChain(cryptoOptions, chainId);
			const firstToken = tokens[0];
			if (tokens.length <= 1) {
				if (!firstToken) {
					throw new Error(`No crypto tokens configured for chain ${chainId}`);
				}
				session.setSelectedToken(firstToken);
				goToStep('connect-wallet');
				return;
			}
			goToStep('select-token');
		},
		[session, goToStep, cryptoOptions],
	);
}

export function useHandleSelectToken(params: UseCheckoutActionsParams) {
	const { session, goToStep } = params;
	return useCallback(
		(token: RaffleCryptoToken) => {
			session.setSelectedToken(token);
			goToStep('connect-wallet');
		},
		[session, goToStep],
	);
}
