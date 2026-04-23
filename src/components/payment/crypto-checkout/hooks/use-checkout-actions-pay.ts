import * as Sentry from '@sentry/nextjs';
import { useCallback } from 'react';
import { toast } from 'sonner';
import {
	encodeFunctionData,
	erc20Abi,
	isAddressEqual,
	type Address,
} from 'viem';

import {
	classifyPayError,
	type PayErrorClassification,
} from '@/components/payment/crypto-checkout/recovery/error-classifier';
import {
	revalidateSessionBeforePay,
	type RevalidateSessionOutcome,
} from '@/components/payment/crypto-checkout/session/pay-session-revalidate';
import { buildBroadcastedRecoveryPlan } from '@/components/payment/crypto-checkout/recovery/recovery-plan';
import { runPayRehydrateBranch } from '@/components/payment/crypto-checkout/guards/rehydrate-guard';
import { throwUnexpectedCase } from '@/components/payment/crypto-checkout/recovery/throw-unexpected';
import { getReviewSessionGuard } from '@/components/payment/crypto-checkout/session/session-guards';
import type { ApplyServerHydrationParams } from '@/components/payment/crypto-checkout/session/use-checkout-session';
import type { UseCheckoutActionsParams } from '@/components/payment/crypto-checkout/use-checkout-actions-params';
import { CRYPTO_TX_SUBMIT_OUTCOME } from '@/lib/web3/payment/crypto-payment-flow';
import { getCryptoSession } from '@/services/payment/get-crypto-session';
import type { RaffleCryptoToken } from '@/types/raffle';
import type { CryptoCheckoutSession } from '@/types/wallet';

export function useHandlePay(params: UseCheckoutActionsParams) {
	return useCallback(() => runHandlePay(params), [params]);
}

interface PayStepArgs {
	p: UseCheckoutActionsParams;
	sessionData: CryptoCheckoutSession;
	selectedToken: RaffleCryptoToken;
	selectedChainId: number;
	claim: { release: () => void };
	capturedFlowVersion: number;
}

async function runHandlePay(p: UseCheckoutActionsParams): Promise<void> {
	const sessionData = p.session.session;
	const { selectedChainId, selectedToken } = p.session;
	if (
		!p.connectedChecksummed ||
		!selectedChainId ||
		!selectedToken ||
		!sessionData
	)
		return;
	const claim = p.guards.guardPay();
	if (!claim.ok) return;
	const capturedFlowVersion = p.guards.getCurrentFlowVersion();
	p.setIsProcessing(true);
	p.setErrorMessage(null);
	let broadcastTxHash: `0x${string}` | undefined;
	const payArgs: PayStepArgs = {
		p,
		sessionData,
		selectedToken,
		selectedChainId,
		claim,
		capturedFlowVersion,
	};
	try {
		if (!(await revalidateAndGuard(payArgs))) return;
		if (!(await switchAndVerifyWalletBinding(payArgs))) return;
		broadcastTxHash = await executeTransfer(payArgs);
		await submitBroadcastHash(p, broadcastTxHash);
	} catch (error) {
		claim.release();
		p.setIsProcessing(false);
		applyPayErrorClassification({
			p,
			classification: classifyPayError(error, broadcastTxHash),
			error,
			sessionData,
			chainId: selectedChainId,
		});
	}
}

async function revalidateAndGuard(args: PayStepArgs): Promise<boolean> {
	const { p, sessionData, selectedToken, claim, capturedFlowVersion } = args;
	const reviewGuard = getReviewSessionGuard({
		connectedAddress: p.connectedChecksummed,
		sessionWalletAddress: p.session.sessionWalletAddress,
		submitDeadline: sessionData.submitDeadline,
	});
	if (reviewGuard.kind === 'wallet-changed') {
		p.session.returnToWalletStep('wallet-changed');
		return false;
	}
	if (reviewGuard.kind === 'session-expired') {
		p.session.returnToWalletStep('session-expired');
		return false;
	}
	const outcome = await revalidateSessionBeforePay(
		sessionData,
		getCryptoSession,
	);
	const next = applyPayRevalidationOutcome({
		p,
		outcome,
		sessionData,
		selectedToken,
		claim,
		capturedFlowVersion,
	});
	return next === 'continue';
}

interface ApplyPayRevalidationArgs {
	p: UseCheckoutActionsParams;
	outcome: RevalidateSessionOutcome;
	sessionData: CryptoCheckoutSession;
	selectedToken: RaffleCryptoToken;
	claim: { release: () => void };
	capturedFlowVersion: number;
}

function applyPayRevalidationOutcome(
	args: ApplyPayRevalidationArgs,
): 'continue' | 'return' {
	const { p, outcome, sessionData, selectedToken, claim, capturedFlowVersion } =
		args;
	switch (outcome.kind) {
		case 'recoverable': {
			claim.release();
			p.setIsProcessing(false);
			toast.error('Unable to refresh checkout state. Please try again.');
			return 'return';
		}
		case 'session-expired': {
			p.session.returnToWalletStep('session-expired', outcome.message);
			return 'return';
		}
		case 'rehydrate': {
			runPayRehydrateBranch({
				capturedFlowVersion,
				getCurrentFlowVersion: () => p.guards.getCurrentFlowVersion(),
				refreshedSession: outcome.refreshedSession,
				sessionData,
				checksummedAddress: p.connectedChecksummed as Address,
				fallbackToken: selectedToken,
				nextStep: outcome.nextStep,
				applyServerHydration: par =>
					p.session.applyServerHydration(
						par satisfies ApplyServerHydrationParams,
					),
				releasePayInFlight: () => claim.release(),
				setIsProcessing: p.setIsProcessing,
			});
			return 'return';
		}
		case 'ok': {
			p.session.setSession({
				...sessionData,
				submitDeadline: outcome.refreshedSession.submitDeadline,
				confirmDeadline: outcome.refreshedSession.confirmDeadline,
			});
			return 'continue';
		}
		default:
			return throwUnexpectedCase(outcome, 'applyPayRevalidationOutcome');
	}
}

async function switchAndVerifyWalletBinding(
	args: PayStepArgs,
): Promise<boolean> {
	const { p, selectedChainId } = args;
	if (!p.isCorrectChain) {
		await p.switchChainAsync({ chainId: selectedChainId });
	}
	if (p.liveChainIdRef.current !== selectedChainId) {
		toast.error('Please switch to the correct network and try again.');
		p.guards.releaseInFlightGuards();
		p.setIsProcessing(false);
		return false;
	}
	const currentAddress = p.liveAddressRef.current;
	if (
		!currentAddress ||
		!p.session.sessionWalletAddress ||
		!isAddressEqual(currentAddress, p.session.sessionWalletAddress)
	) {
		p.session.returnToWalletStep('wallet-changed');
		return false;
	}
	p.tx.setTxSubmitted(true);
	p.goToStep('confirming');
	return true;
}

async function executeTransfer(args: PayStepArgs): Promise<`0x${string}`> {
	const { p, sessionData, selectedChainId } = args;
	const transferData = encodeFunctionData({
		abi: erc20Abi,
		functionName: 'transfer',
		args: [
			sessionData.treasuryAddress as `0x${string}`,
			BigInt(sessionData.amountRaw),
		],
	});
	const submittedTxHash = await p.sendTransactionAsync({
		to: sessionData.tokenAddress as `0x${string}`,
		data: transferData,
		chainId: selectedChainId,
	});
	p.tx.setTxHash(submittedTxHash);
	return submittedTxHash;
}

async function submitBroadcastHash(
	p: UseCheckoutActionsParams,
	submittedTxHash: `0x${string}`,
): Promise<void> {
	const submitOutcome = await p.tx.registerTxHashWithBackend(submittedTxHash);
	if (submitOutcome.kind === CRYPTO_TX_SUBMIT_OUTCOME.TERMINAL) {
		p.setIsProcessing(false);
		p.failSubmittedTxRegistration();
		return;
	}
	p.setIsProcessing(false);
}

interface PayErrorCryptoContext {
	tokenAddress: string;
	amountRaw: string;
	sessionId: string;
	walletAddress: Address;
	[key: string]: unknown;
}

interface PayErrorArgs {
	p: UseCheckoutActionsParams;
	classification: PayErrorClassification;
	error: unknown;
	sessionData: CryptoCheckoutSession;
	chainId: number;
}

function applyPayErrorClassification(args: PayErrorArgs): void {
	const { p, classification, error, sessionData, chainId } = args;
	const crypto: PayErrorCryptoContext = {
		tokenAddress: sessionData.tokenAddress,
		amountRaw: sessionData.amountRaw,
		sessionId: sessionData.id,
		walletAddress: p.connectedChecksummed as Address,
	};
	switch (classification.kind) {
		case 'broadcasted-needs-recovery':
			handleBroadcastedRecoveryError({
				p,
				error,
				chainId,
				crypto,
				broadcastTxHash: classification.broadcastTxHash,
			});
			return;
		case 'user-rejection':
			p.tx.setTxSubmitted(false);
			toast.info('Transaction cancelled.');
			p.goToStep('review');
			return;
		case 'fee-cap-too-low':
			handleFeeCapTooLowError({
				p,
				error,
				chainId,
				crypto,
				message: classification.message,
			});
			return;
		case 'wallet-error':
			handleWalletError({
				p,
				error,
				chainId,
				crypto,
				message: classification.message,
			});
			return;
		default:
			throwUnexpectedCase(classification, 'applyPayErrorClassification');
	}
}

interface BroadcastRecoveryArgs {
	p: UseCheckoutActionsParams;
	error: unknown;
	chainId: number;
	crypto: PayErrorCryptoContext;
	broadcastTxHash: `0x${string}`;
}

function handleBroadcastedRecoveryError(args: BroadcastRecoveryArgs): void {
	const { p, error, chainId, crypto, broadcastTxHash } = args;
	const plan = buildBroadcastedRecoveryPlan();
	p.tx.setSubmitRecoveryMode(plan.submitRecoveryMode);
	p.tx.setRetryBlocked(plan.retryBlocked);
	Sentry.captureException(error, {
		level: 'warning',
		tags: {
			service: 'payment',
			action: 'crypto-wallet-transfer',
			recovery: 'post-broadcast-throw',
			chainId,
		},
		contexts: { crypto: { ...crypto, txHash: broadcastTxHash } },
	});
}

interface CategorizedPayErrorArgs {
	p: UseCheckoutActionsParams;
	error: unknown;
	chainId: number;
	crypto: PayErrorCryptoContext;
	message: string;
}

function handleFeeCapTooLowError(args: CategorizedPayErrorArgs): void {
	const { p, error, chainId, crypto, message } = args;
	p.tx.setTxSubmitted(false);
	console.warn('Crypto payment fee-cap mismatch:', error);
	Sentry.captureException(error, {
		level: 'warning',
		tags: {
			service: 'payment',
			action: 'crypto-wallet-transfer',
			chainId,
			recovery: 'retryable-fee-cap-too-low',
		},
		contexts: { crypto },
	});
	toast.error(message);
	p.goToStep('review');
}

function handleWalletError(args: CategorizedPayErrorArgs): void {
	const { p, error, chainId, crypto, message } = args;
	p.tx.setTxSubmitted(false);
	console.error('Crypto payment error:', error);
	Sentry.captureException(error, {
		tags: {
			service: 'payment',
			action: 'crypto-wallet-transfer',
			chainId,
		},
		contexts: { crypto },
	});
	p.tx.setRetryBlocked(false);
	p.setErrorMessage(message);
	p.goToStep('failure');
}
