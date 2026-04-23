import { useCallback } from 'react';
import { toast } from 'sonner';
import type { Address } from 'viem';

import { throwUnexpectedCase } from '@/components/payment/crypto-checkout/recovery/throw-unexpected';
import type { UseCheckoutActionsParams } from '@/components/payment/crypto-checkout/use-checkout-actions-params';
import {
	classifyWalletReadyAtomicOutcome,
	classifyWalletReadySigError,
	deriveAtomicCheckoutInput,
	type HandleWalletReadyAtomicOutcome,
	handleWalletReadyEnsureVerified,
	isExistingSessionReusable,
} from '@/components/payment/crypto-checkout/guards/wallet-ready-guards';
import {
	getPaymentErrorMessage,
	getWalletErrorMessage,
	shouldClearPromo,
} from '@/lib/checkout/error-messages';
import { isUserRejection } from '@/lib/web3/errors';
import { createAtomicCryptoCheckout } from '@/services/payment/create-atomic-crypto-checkout';
import { verifyWallet } from '@/services/wallet/verify-wallet';
import type { RaffleCryptoToken } from '@/types/raffle';

export function useHandleWalletReady(params: UseCheckoutActionsParams) {
	return useCallback(() => runHandleWalletReady(params), [params]);
}

interface WalletReadyStepArgs {
	p: UseCheckoutActionsParams;
	selectedChainId: number;
	selectedToken: RaffleCryptoToken;
	flowVersion: number;
}

async function runHandleWalletReady(
	p: UseCheckoutActionsParams,
): Promise<void> {
	const { session, guards, connectedChecksummed } = p;
	const selectedChainId = session.selectedChainId;
	const selectedToken = session.selectedToken;
	if (!connectedChecksummed || !selectedChainId || !selectedToken) return;
	const claim = guards.guardWalletReady();
	if (!claim.ok) return;
	const flowVersion = guards.reserveNextFlowVersion();
	guards.commitFlowVersion(flowVersion);
	guards.clearCloseReset();
	p.setIsProcessing(true);
	const stepArgs: WalletReadyStepArgs = {
		p,
		selectedChainId,
		selectedToken,
		flowVersion,
	};
	try {
		if (!(await runWalletVerification(stepArgs))) return;
		if (await reuseExistingSessionIfAny(stepArgs)) return;
		await runAtomicCheckout(stepArgs);
	} catch (error) {
		if (guards.getCurrentFlowVersion() !== flowVersion) return;
		const sigError = classifyWalletReadySigError(error, isUserRejection);
		toast[sigError.tone](sigError.text);
	} finally {
		claim.release();
		if (guards.getCurrentFlowVersion() !== flowVersion) return;
		p.setIsProcessing(false);
	}
}

async function runWalletVerification(
	args: WalletReadyStepArgs,
): Promise<boolean> {
	const { p, flowVersion } = args;
	const verification = await handleWalletReadyEnsureVerified({
		isWalletVerified: p.isWalletVerified,
		userId: p.userId,
		checksummedAddress: p.connectedChecksummed as Address,
		flowVersion,
		isFlowCurrent: v => p.guards.getCurrentFlowVersion() === v,
		signMessage: p.signMessageAsync,
		verify: verifyWallet,
		refetchWallets: p.refetchWallets,
	});
	switch (verification.kind) {
		case 'skip':
		case 'verified':
			return true;
		case 'missing-user':
			toast.error('Please sign in to verify your wallet.');
			return false;
		case 'verify-failed':
			toast.error(getWalletErrorMessage(verification.error));
			return false;
		case 'flow-stale':
			return false;
		default:
			return throwUnexpectedCase(verification, 'runWalletVerification');
	}
}

async function reuseExistingSessionIfAny(
	args: WalletReadyStepArgs,
): Promise<boolean> {
	const { p, selectedChainId, selectedToken, flowVersion } = args;
	const sessionData = p.session.session;
	if (!sessionData) return false;
	if (
		!isExistingSessionReusable({
			session: sessionData,
			selectedChainId,
			sessionTokenId: p.session.sessionTokenId,
			selectedToken,
			connectedAddress: p.connectedChecksummed as Address,
			sessionWalletAddress: p.session.sessionWalletAddress,
		})
	) {
		return false;
	}
	await p.session.hydrateCheckoutSession({
		checkoutSession: sessionData,
		checksummedAddress: p.connectedChecksummed as Address,
		fallbackToken: selectedToken,
		flowVersion,
	});
	return true;
}

async function runAtomicCheckout(args: WalletReadyStepArgs): Promise<void> {
	const { p, selectedChainId, selectedToken, flowVersion } = args;
	const quantityRef = p.session.confirmedTicketQuantity;
	quantityRef.current = p.ticketQuantity;
	const checkoutResult = await createAtomicCryptoCheckout(
		deriveAtomicCheckoutInput({
			raffleId: p.raffleId,
			ticketQuantity: p.ticketQuantity,
			promoCode: p.promoCode,
			selectedChainId,
			walletAddress: p.connectedChecksummed as Address,
			selectedToken,
		}),
	);
	if (p.guards.getCurrentFlowVersion() !== flowVersion) return;
	const atomicOutcome = classifyWalletReadyAtomicOutcome(
		checkoutResult,
		shouldClearPromo,
	);
	await applyAtomicOutcome({
		p,
		outcome: atomicOutcome,
		flowVersion,
		token: selectedToken,
	});
}

interface ApplyAtomicOutcomeArgs {
	p: UseCheckoutActionsParams;
	outcome: HandleWalletReadyAtomicOutcome;
	flowVersion: number;
	token: RaffleCryptoToken;
}

async function applyAtomicOutcome(args: ApplyAtomicOutcomeArgs): Promise<void> {
	const { p, outcome, flowVersion, token } = args;
	switch (outcome.kind) {
		case 'failed':
			if (outcome.clearPromo) p.onPromoInvalid?.();
			p.setErrorMessage(getPaymentErrorMessage(outcome.error));
			p.goToStep('failure');
			return;
		case 'zero-total':
			toast.success('Promo applied. Bonus entries claimed successfully!');
			p.onSuccess?.(p.session.confirmedTicketQuantity.current);
			p.onOpenChange(false);
			return;
		case 'session':
			await p.session.hydrateCheckoutSession({
				checkoutSession: outcome.session,
				checksummedAddress: p.connectedChecksummed as Address,
				fallbackToken: token,
				flowVersion,
			});
			return;
		default:
			throwUnexpectedCase(outcome, 'applyAtomicOutcome');
	}
}
