'use client';

import type { Address } from 'viem';

import { ChainSelector } from '@/components/payment/crypto-checkout/selectors/chain-selector';
import { ConfirmingStep } from '@/components/payment/crypto-checkout/steps/confirming-step';
import { ReviewStep } from '@/components/payment/crypto-checkout/steps/review-step';
import type { CheckoutStep } from '@/components/payment/crypto-checkout/steps/step-progress';
import {
	FailureStep,
	SuccessStep,
} from '@/components/payment/crypto-checkout/steps/terminal-steps';
import { TokenSelector } from '@/components/payment/crypto-checkout/selectors/token-selector';
import type { NormalizedTokenBalance } from '@/components/payment/crypto-checkout/hooks/use-checkout-wagmi-reads';
import { WalletStep } from '@/components/payment/crypto-checkout/steps/wallet-step';
import { Button } from '@/components/ui/button';
import type { CryptoChainConfig } from '@/types/crypto-config';
import type { RaffleCryptoOptions, RaffleCryptoToken } from '@/types/raffle';
import type { CryptoCheckoutSession } from '@/types/wallet';

interface CheckoutStepBodyProps {
	step: CheckoutStep;
	chains: CryptoChainConfig[];
	cryptoOptions: RaffleCryptoOptions;
	resolvedChainIds: number[];
	selectedChainId: number | null;
	tokensForChain: (chainId: number) => RaffleCryptoToken[];
	session: CryptoCheckoutSession | null;
	raffleEndAt: string;
	tokenSymbol: string;
	isCorrectChain: boolean;
	tokenBalance: NormalizedTokenBalance | undefined;
	isTokenBalanceLoading: boolean;
	isBalanceError: boolean;
	isBalanceCheckPending: boolean;
	isProcessing: boolean;
	txSubmitted: boolean;
	reviewSessionBlockMessage: string | null;
	connectedAddress: Address | undefined;
	isWalletVerified: boolean;
	nativeBalance:
		| { value: bigint; decimals: number; symbol: string }
		| undefined;
	txHash: `0x${string}` | undefined;
	confirmationTarget: number | null;
	observedConfirmationCount: number;
	finalizationRequested: boolean;
	errorMessage: string | null;
	fundsAtRisk: boolean;
	retryBlocked: boolean;
	onSelectChain: (chainId: number) => void;
	onSelectToken: (token: RaffleCryptoToken) => void;
	onWalletReady: () => void;
	onPay: () => void;
	onClose: () => void;
	onReset: () => void;
}

/**
 * Renders the active step's body within the dialog.
 *
 * Extracted from the modal so the parent stays under the 150-LOC cap. The
 * step guard pattern (checking `selectedChainId !== null`, etc.) lives
 * here so the parent doesn't have to repeat the null-narrowing branches.
 *
 * @param props - Every piece of reactive state the steps render from
 */
export function CheckoutStepBody(props: CheckoutStepBodyProps) {
	const { step, selectedChainId } = props;
	if (step === 'select-chain') {
		if (props.resolvedChainIds.length === 0) {
			return <UnavailableChainState onClose={props.onClose} />;
		}
		return (
			<ChainSelector
				cryptoChainIds={props.resolvedChainIds}
				cryptoOptions={props.cryptoOptions}
				onSelectChain={props.onSelectChain}
			/>
		);
	}
	if (step === 'select-token' && selectedChainId !== null) {
		return (
			<TokenSelector
				tokens={props.tokensForChain(selectedChainId)}
				onSelectToken={props.onSelectToken}
			/>
		);
	}
	if (step === 'connect-wallet') {
		return (
			<WalletStep
				address={props.connectedAddress}
				isWalletVerified={props.isWalletVerified}
				isProcessing={props.isProcessing}
				nativeBalance={props.nativeBalance ?? undefined}
				onWalletReady={props.onWalletReady}
			/>
		);
	}
	if (step === 'review' && selectedChainId !== null) {
		return (
			<ReviewStep
				session={props.session}
				raffleEndAt={props.raffleEndAt}
				selectedChainId={selectedChainId}
				tokenSymbol={props.tokenSymbol}
				isCorrectChain={props.isCorrectChain}
				tokenBalance={props.tokenBalance ?? undefined}
				isTokenBalanceLoading={props.isTokenBalanceLoading}
				isTokenBalanceError={props.isBalanceError}
				isBalanceCheckPending={props.isBalanceCheckPending}
				isProcessing={props.isProcessing}
				txSubmitted={props.txSubmitted}
				sessionBlockMessage={props.reviewSessionBlockMessage}
				chains={props.chains}
				onPay={props.onPay}
			/>
		);
	}
	if (
		step === 'confirming' &&
		selectedChainId !== null &&
		props.confirmationTarget !== null
	) {
		return (
			<ConfirmingStep
				txHash={props.txHash}
				selectedChainId={selectedChainId}
				confirmations={props.observedConfirmationCount}
				confirmationTarget={props.confirmationTarget}
				finalizationRequested={props.finalizationRequested}
				chains={props.chains}
			/>
		);
	}
	if (step === 'success' && selectedChainId !== null) {
		return (
			<SuccessStep
				txHash={props.txHash}
				selectedChainId={selectedChainId}
				chains={props.chains}
				onClose={props.onClose}
			/>
		);
	}
	if (step === 'failure') {
		return (
			<FailureStep
				txHash={props.txHash}
				selectedChainId={selectedChainId ?? undefined}
				chains={props.chains}
				errorMessage={props.errorMessage}
				fundsAtRisk={props.fundsAtRisk}
				retryBlocked={props.retryBlocked}
				onClose={props.onClose}
				onReset={props.onReset}
			/>
		);
	}
	return null;
}

/**
 * Defensive empty-state for backend/frontend deploy skew.
 *
 * The CTA is already hidden when no selectable chain survives, but keep
 * the modal resilient too so a stale client tree or forced-open state
 * never traps the user in an empty selector with no recovery path.
 */
function UnavailableChainState({ onClose }: { onClose: () => void }) {
	return (
		<div className="flex flex-col items-center gap-5 py-6">
			<p className="text-ink-500 text-center text-sm">
				Crypto payments are temporarily unavailable for this sweepstakes in the
				current app environment.
			</p>
			<Button
				onClick={onClose}
				className="h-12 w-full border-2 border-black bg-black hover:bg-white hover:text-black"
			>
				Close
			</Button>
		</div>
	);
}
