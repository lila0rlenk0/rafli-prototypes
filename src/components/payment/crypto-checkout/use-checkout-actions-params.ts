import type { CheckoutStep } from '@/components/payment/crypto-checkout/steps/step-progress';
import type { CheckoutFlowGuardsApi } from '@/components/payment/crypto-checkout/hooks/use-flow-guards';
import type { useCheckoutSession } from '@/components/payment/crypto-checkout/session/use-checkout-session';
import type { useTxTracking } from '@/components/payment/crypto-checkout/hooks/use-tx-tracking';
import type { RaffleCryptoOptions } from '@/types/raffle';
import type { Address } from 'viem';

/** Matches the Dialog close animation (`data-[state=closed]:duration-300`). */
export const CLOSE_ANIMATION_MS = 300;

export type SessionHandle = ReturnType<typeof useCheckoutSession>;
export type TxHandle = ReturnType<typeof useTxTracking>;

/**
 * Dependencies the handlers hook consumes. Kept as a single params object
 * so the hook call site stays readable and `useCallback` dep lists don't
 * balloon to 20+ entries.
 */
export interface UseCheckoutActionsParams {
	step: CheckoutStep;
	goToStep: (step: CheckoutStep) => void;
	cryptoOptions: RaffleCryptoOptions;
	session: SessionHandle;
	tx: TxHandle;
	fe: { resetConfirmation: () => void };
	guards: CheckoutFlowGuardsApi;
	raffleId: string;
	ticketQuantity: number;
	promoCode?: string;
	onPromoInvalid?: () => void;
	onSuccess?: (confirmedQuantity: number) => void;
	onOpenChange: (open: boolean) => void;
	userId?: string | null;
	connectedChecksummed: Address | null;
	liveAddressRef: { current: Address | null };
	liveChainIdRef: { current: number | undefined };
	isWalletVerified: boolean;
	isCorrectChain: boolean;
	signMessageAsync: (args: { message: string }) => Promise<`0x${string}`>;
	switchChainAsync: (args: { chainId: number }) => Promise<unknown>;
	sendTransactionAsync: (args: {
		to: `0x${string}`;
		data: `0x${string}`;
		chainId: number;
	}) => Promise<`0x${string}`>;
	resetSendTransaction: () => void;
	refetchWallets: () => Promise<unknown>;
	setIsProcessing: (v: boolean) => void;
	setErrorMessage: (v: string | null) => void;
	setFundsAtRisk: (v: boolean) => void;
	failSubmittedTxRegistration: () => void;
	abandonOrder: (orderId: string, method: 'crypto') => Promise<unknown>;
	fundsAtRisk: boolean;
	retryBlocked: boolean;
}
