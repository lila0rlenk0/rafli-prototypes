'use client';

import { CheckoutModalHeader } from '@/components/payment/crypto-checkout/modal-header';
import { CheckoutStepBody } from '@/components/payment/crypto-checkout/steps/step-body';
import { tokensForChain } from '@/components/payment/crypto-checkout/hooks/use-checkout-actions';
import {
	useCryptoCheckoutModal,
	type UseCryptoCheckoutModalParams,
} from './hooks/use-crypto-checkout-modal';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { RaffleCryptoOptions } from '@/types/raffle';

// Re-export the server-hydration type the existing integration surface
// references so downstream imports from this module stay working.
export type { ApplyServerHydrationParams } from '@/components/payment/crypto-checkout/session/use-checkout-session';

interface CryptoCheckoutModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Raffle ID — atomic checkout creates order + session from this */
	raffleId: string;
	/** Number of tickets to purchase */
	ticketQuantity: number;
	/** Optional promo code — applied atomically during checkout */
	promoCode?: string;
	/** Called when promo code is invalid and should be cleared from UI */
	onPromoInvalid?: () => void;
	raffleEndAt: string;
	/** Structured crypto options from raffle — chains with selectable tokens */
	cryptoOptions: RaffleCryptoOptions;
	userId?: string | null;
	/** Called on successful payment — passes the session's ticket quantity for sync targeting */
	onSuccess?: (confirmedQuantity: number) => void;
	/** Notifies parent when confirming state changes — used to show persistent "pending" button */
	onConfirmingChange?: (isConfirming: boolean) => void;
}

/**
 * Multi-step modal for the full crypto payment flow.
 *
 * All of the orchestration (state, hook composition, handlers, terminal
 * sync) lives in `useCryptoCheckoutModal`. This component is now just the
 * Dialog shell plus a step-body frame.
 *
 * Backend handles cross-method guards — atomic checkout cancels
 * incompatible sessions.
 *
 * @param props - Modal open state + raffle context + success notifications
 */
export function CryptoCheckoutModal(props: CryptoCheckoutModalProps) {
	const { raffleEndAt, cryptoOptions } = props;
	const modalParams: UseCryptoCheckoutModalParams = props;
	const m = useCryptoCheckoutModal(modalParams);
	const tokenAddressForReads = m.session.session?.tokenAddress as
		| `0x${string}`
		| undefined;
	const isBalanceCheckPending =
		!tokenAddressForReads || !m.wagmi.balanceReadAddress;
	return (
		<Dialog
			open={props.open}
			onOpenChange={open => !open && m.handlers.handleClose()}
		>
			<DialogContent className="border-ink-alpha max-w-md overflow-hidden border bg-white px-8 py-10">
				<CheckoutModalHeader
					step={m.ui.step}
					selectedChainId={m.session.selectedChainId}
					tokenCountForSelectedChain={
						m.session.selectedChainId
							? tokensForChain(cryptoOptions, m.session.selectedChainId).length
							: 0
					}
					hasSelectableChains={m.resolvedChainIds.length > 0}
					onBack={m.handlers.handleBack}
				/>
				<div className="flex flex-col gap-4 pt-2">
					<CheckoutStepBody
						step={m.ui.step}
						chains={m.chains}
						cryptoOptions={cryptoOptions}
						resolvedChainIds={m.resolvedChainIds}
						selectedChainId={m.session.selectedChainId}
						tokensForChain={id => tokensForChain(cryptoOptions, id)}
						session={m.session.session}
						raffleEndAt={raffleEndAt}
						tokenSymbol={m.session.selectedToken?.symbol ?? 'USDC'}
						isCorrectChain={
							m.session.selectedChainId === m.wagmi.connectedChainId
						}
						tokenBalance={m.wagmi.tokenBalance ?? undefined}
						isTokenBalanceLoading={m.wagmi.isTokenBalanceLoading}
						isBalanceError={m.wagmi.isBalanceError}
						isBalanceCheckPending={isBalanceCheckPending}
						isProcessing={m.ui.isProcessing}
						txSubmitted={m.tx.txSubmitted}
						reviewSessionBlockMessage={m.reviewSessionBlockMessage}
						connectedAddress={m.wagmi.address ?? undefined}
						isWalletVerified={m.isWalletVerified}
						nativeBalance={m.wagmi.nativeBalance ?? undefined}
						txHash={m.tx.txHash}
						confirmationTarget={m.session.session?.confirmationTarget ?? null}
						observedConfirmationCount={m.wagmi.observedConfirmationCount}
						finalizationRequested={m.fe.finalizationRequested}
						errorMessage={m.ui.errorMessage}
						fundsAtRisk={m.ui.fundsAtRisk}
						retryBlocked={m.tx.retryBlocked}
						onSelectChain={m.handlers.handleSelectChain}
						onSelectToken={m.handlers.handleSelectToken}
						onWalletReady={m.handlers.handleWalletReady}
						onPay={m.handlers.handlePay}
						onClose={m.handlers.handleClose}
						onReset={m.handlers.handleReset}
					/>
				</div>
			</DialogContent>
		</Dialog>
	);
}
