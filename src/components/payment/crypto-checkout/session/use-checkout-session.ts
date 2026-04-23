'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { type Address } from 'viem';

import { getHydratedCheckoutStep } from '@/components/payment/crypto-checkout/session/session-guards';
import { mapPolledCryptoFailureReasonToUserMessage } from '@/lib/checkout/error-messages';
import { isValidTxHash } from '@/lib/web3/format/block-explorers';
import { getCryptoSession } from '@/services/payment/get-crypto-session';
import type { RaffleCryptoOptions, RaffleCryptoToken } from '@/types/raffle';
import type { CryptoCheckoutSession } from '@/types/wallet';

import { buildRecoveredCheckoutToken } from './checkout-session-token';
import type { ApplyRuntimeStateParams } from '@/components/payment/crypto-checkout/confirmation/tx-runtime-merge';

// ==========================================
// Re-exports (stable public API for the test + consumers)
// ==========================================

export { buildRecoveredCheckoutToken } from './checkout-session-token';

// ==========================================
// Constants
// ==========================================

/** Default failure message when backend provides no actionable reason */
const FALLBACK_FAILURE_MESSAGE =
	'Payment verification failed. Please try again.';

// ==========================================
// Types (mirror the original modal-scope shapes)
// ==========================================

/**
 * Checkout step the hook drives via `goToStep` — kept as a structural type
 * so the hook doesn't have to import the modal's step union.
 */
export type CheckoutStep =
	| 'select-chain'
	| 'select-token'
	| 'connect-wallet'
	| 'review'
	| 'confirming'
	| 'success'
	| 'failure';

/** Minimal server session shape needed by the hydration helper. */
export interface ServerSessionSnapshot {
	currency: string;
	txHash: string | null;
	failureReason?: string | null;
	submitDeadline: string;
	confirmDeadline: string;
}

/** Params for the shared server→local hydration mapper. */
export interface ApplyServerHydrationParams {
	serverSession: ServerSessionSnapshot;
	checkoutSession: CryptoCheckoutSession;
	checksummedAddress: Address;
	fallbackToken: RaffleCryptoToken;
	nextStep: CheckoutStep;
}

/** Params for `applySessionState`. */
export interface ApplySessionStateParams {
	checkoutSession: CryptoCheckoutSession;
	checksummedAddress: Address;
	token: RaffleCryptoToken;
}

/** Params for `hydrateCheckoutSession`. */
export interface HydrateCheckoutSessionParams {
	checkoutSession: CryptoCheckoutSession;
	checksummedAddress: Address;
	fallbackToken: RaffleCryptoToken;
	flowVersion: number;
}

/**
 * Modal-owned effects / state the session hook calls into.
 * - `applyRuntimeState` — tx-tracking reset, wired from the sibling hook
 * - `transitionToSuccess` — fe-confirmation success transition
 * - `isPreConfirmingFlowCurrent` — flow-version guard owned by the modal
 *   (per plan risks: stays in component scope, NOT migrated into this hook)
 */
export interface UseCheckoutSessionDeps {
	cryptoOptions: RaffleCryptoOptions;
	ticketQuantity: number;
	applyRuntimeState: (params: ApplyRuntimeStateParams) => void;
	goToStep: (step: CheckoutStep) => void;
	transitionToSuccess: () => void;
	isPreConfirmingFlowCurrent: (flowVersion: number) => boolean;
	releasePayInFlight: () => void;
	setIsProcessing: (value: boolean) => void;
}

// ==========================================
// State cluster
// ==========================================

interface SessionStateCluster {
	session: CryptoCheckoutSession | null;
	sessionTokenId: string | null;
	sessionWalletAddress: Address | null;
	selectedChainId: number | null;
	selectedToken: RaffleCryptoToken | null;
	setSession: (v: CryptoCheckoutSession | null) => void;
	setSessionTokenId: (v: string | null) => void;
	setSessionWalletAddress: (v: Address | null) => void;
	setSelectedChainId: (v: number | null) => void;
	setSelectedToken: (v: RaffleCryptoToken | null) => void;
}

/**
 * Owns the five-piece session/chain/token state cluster in one place so
 * the exported hook body stays under the 60-LOC cap.
 *
 * @returns Aggregate state + setters the hook threads into operations
 */
function useSessionStateCluster(): SessionStateCluster {
	const [session, setSession] = useState<CryptoCheckoutSession | null>(null);
	// Tracks the tokenId used at session creation time so a user who
	// navigates back to pick a different token doesn't silently reuse the
	// prior session.
	const [sessionTokenId, setSessionTokenId] = useState<string | null>(null);
	// Backend binds each session to a verified sender wallet (`fromAddress`).
	// Track the address used at session creation so back-navigation cannot
	// reuse wallet A's session after the user reconnects wallet B.
	const [sessionWalletAddress, setSessionWalletAddress] =
		useState<Address | null>(null);
	const [selectedChainId, setSelectedChainId] = useState<number | null>(null);
	const [selectedToken, setSelectedToken] = useState<RaffleCryptoToken | null>(
		null,
	);
	return {
		session,
		sessionTokenId,
		sessionWalletAddress,
		selectedChainId,
		selectedToken,
		setSession,
		setSessionTokenId,
		setSessionWalletAddress,
		setSelectedChainId,
		setSelectedToken,
	};
}

// ==========================================
// Hook
// ==========================================

/**
 * Session-bound state for the crypto checkout modal.
 *
 * Consolidates the session/chain/token cluster plus the recovery helpers
 * that read or mutate that cluster: `applySessionState`,
 * `applyServerHydration`, `clearSessionBoundCheckout`,
 * `hydrateCheckoutSession`, `returnToWalletStep`, `buildRecoveredToken`.
 *
 * @param deps - Modal-scope callables + raffle options + live ticket quantity
 * @returns Session state, setters, `confirmedTicketQuantity` ref, + operations
 */
export function useCheckoutSession(deps: UseCheckoutSessionDeps) {
	const st = useSessionStateCluster();
	// Captured quantity — transitionToSuccess reports the checkout-time
	// value, not the parent's live slider (can drift during confirming).
	const confirmedTicketQuantity = useRef(deps.ticketQuantity);
	// useEffect: sync target = keep depsRef aligned with the latest props.
	const depsRef = useRef(deps);
	useEffect(() => {
		depsRef.current = deps;
	});
	const ops = useCheckoutSessionOps(st, confirmedTicketQuantity, depsRef);
	return { ...st, confirmedTicketQuantity, ...ops };
}

// ==========================================
// Operations subhook
// ==========================================

/**
 * Builds the six exported operations as identity-stable callables.
 *
 * Extracted from the main hook so the exported body stays under the
 * 60-LOC cap. Each `useCallback` has an empty-or-minimal dep array —
 * `depsRef` is read lazily inside each runner, and `st`'s setters are
 * identity-stable from React.
 *
 * @param st - State cluster (refs + setters) from `useSessionStateCluster`
 * @param confirmedTicketQuantity - Checkout-time quantity capture ref
 * @param depsRef - Latest-props ref synced by the main hook
 * @returns The six operations consumed by the modal
 */
function useCheckoutSessionOps(
	st: SessionStateCluster,
	confirmedTicketQuantity: { current: number },
	depsRef: { current: UseCheckoutSessionDeps },
) {
	const core = useCoreSessionOps(st, confirmedTicketQuantity, depsRef);
	const clearSessionBoundCheckout = useCallback(
		() => runClearSessionBoundCheckout(st, depsRef),
		[st, depsRef],
	);
	const returnToWalletStep = useCallback(
		(reason: 'wallet-changed' | 'session-expired', message?: string) =>
			runReturnToWalletStep(reason, message, {
				clearSessionBoundCheckout,
				depsRef,
			}),
		[clearSessionBoundCheckout, depsRef],
	);
	const hydrateCheckoutSession = useCallback(
		(params: HydrateCheckoutSessionParams) =>
			runHydrateCheckoutSession(params, {
				applySessionState: core.applySessionState,
				applyServerHydration: core.applyServerHydration,
				depsRef,
			}),
		[core.applySessionState, core.applyServerHydration, depsRef],
	);
	const resetSession = useCallback(() => runResetSession(st), [st]);
	return {
		...core,
		clearSessionBoundCheckout,
		hydrateCheckoutSession,
		returnToWalletStep,
		resetSession,
	};
}

/**
 * Sub-split of `useCheckoutSessionOps` — owns the three ops that have no
 * dependency on the wallet-return / hydrate operations, so the parent
 * subhook can stay under the 60-LOC cap.
 *
 * @param st - State cluster
 * @param confirmedTicketQuantity - Checkout-time quantity capture ref
 * @param depsRef - Latest-props ref
 * @returns The three core operations
 */
function useCoreSessionOps(
	st: SessionStateCluster,
	confirmedTicketQuantity: { current: number },
	depsRef: { current: UseCheckoutSessionDeps },
) {
	const buildRecoveredToken = useCallback(
		(
			currency: string,
			chainId: number,
			fallbackToken: RaffleCryptoToken,
		): RaffleCryptoToken =>
			buildRecoveredCheckoutToken({
				currency,
				chainId,
				fallbackToken,
				cryptoOptions: depsRef.current.cryptoOptions,
			}),
		[depsRef],
	);
	const applySessionState = useCallback(
		(params: ApplySessionStateParams) =>
			runApplySessionState(params, st, confirmedTicketQuantity),
		[st, confirmedTicketQuantity],
	);
	const applyServerHydration = useCallback(
		(params: ApplyServerHydrationParams) =>
			runApplyServerHydration(params, {
				applySessionState,
				buildRecoveredToken,
				depsRef,
			}),
		[applySessionState, buildRecoveredToken, depsRef],
	);
	return { applySessionState, applyServerHydration, buildRecoveredToken };
}

// ==========================================
// Module-scope operation runners
// ==========================================

/**
 * Commits session-bound selection state in one atomic write so chain,
 * token, session snapshot, and the bound wallet never drift apart during
 * recovery.
 *
 * @param params - Session + checksummed address + token to commit
 * @param st - State cluster setters
 * @param confirmedTicketQuantity - Checkout-time quantity capture ref
 */
function runApplySessionState(
	params: ApplySessionStateParams,
	st: SessionStateCluster,
	confirmedTicketQuantity: { current: number },
): void {
	const { checkoutSession, checksummedAddress, token } = params;
	st.setSelectedChainId(checkoutSession.chainId);
	st.setSelectedToken(token);
	st.setSession(checkoutSession);
	st.setSessionTokenId(token.tokenId);
	st.setSessionWalletAddress(checksummedAddress);
	// Sync checkout-time quantity from backend session when available.
	// Without this, a page-refresh-resume re-initializes the ref from the
	// parent slider prop (which may have drifted during confirming), and
	// `onSuccess` then reports the wrong quantity to the sync target. The
	// `undefined` guard keeps older backend deploys working until the
	// field is consistently present. Bug class: stale state on resume.
	if (checkoutSession.ticketQuantity !== undefined) {
		confirmedTicketQuantity.current = checkoutSession.ticketQuantity;
	}
}

interface ApplyServerHydrationRefs {
	applySessionState: (params: ApplySessionStateParams) => void;
	buildRecoveredToken: (
		currency: string,
		chainId: number,
		fallbackToken: RaffleCryptoToken,
	) => RaffleCryptoToken;
	depsRef: { current: UseCheckoutSessionDeps };
}

/**
 * Applies authoritative server session state to local checkout.
 *
 * Shared by initial hydration (wallet-ready) and pay-time revalidation
 * to avoid duplicating the session→state mapping.
 *
 * @param params - Server snapshot + local context + next step
 * @param refs - Hook-owned callables + latest-deps ref
 * @returns Transition outcome used by the caller to decide whether to proceed
 */
export function runApplyServerHydration(
	params: ApplyServerHydrationParams,
	refs: ApplyServerHydrationRefs,
): 'success' | 'failure' | 'step' {
	const {
		serverSession,
		checkoutSession,
		checksummedAddress,
		fallbackToken,
		nextStep,
	} = params;
	const recoveredToken = refs.buildRecoveredToken(
		serverSession.currency,
		checkoutSession.chainId,
		fallbackToken,
	);
	const hydratedCheckoutSession = {
		...checkoutSession,
		submitDeadline: serverSession.submitDeadline,
		confirmDeadline: serverSession.confirmDeadline,
	};
	// Validate txHash format before casting — backend returns a plain string,
	// but wagmi hooks expect strict `0x${string}`. Reject malformed hashes
	// at hydration rather than propagating into hook state where they'd
	// cause silent RPC failures.
	const recoveredTxHash: `0x${string}` | null =
		serverSession.txHash && isValidTxHash(serverSession.txHash)
			? (serverSession.txHash as `0x${string}`)
			: null;
	refs.applySessionState({
		checkoutSession: hydratedCheckoutSession,
		checksummedAddress,
		token: recoveredToken,
	});
	refs.depsRef.current.applyRuntimeState({
		txHash: recoveredTxHash ?? undefined,
		txSubmitted: nextStep === 'confirming' ? true : !!recoveredTxHash,
		backendTrackedHash: recoveredTxHash,
		backendOwnsTx: nextStep === 'confirming' || !!recoveredTxHash,
		errorMessage:
			nextStep === 'failure'
				? mapPolledCryptoFailureReasonToUserMessage(
						serverSession.failureReason,
						FALLBACK_FAILURE_MESSAGE,
					)
				: null,
	});
	if (nextStep === 'success') {
		refs.depsRef.current.transitionToSuccess();
		return 'success';
	}
	if (nextStep === 'failure') {
		refs.depsRef.current.goToStep('failure');
		return 'failure';
	}
	refs.depsRef.current.goToStep(nextStep);
	return 'step';
}

/**
 * Clears the session-bound cluster when the current review session is no
 * longer sendable. Chain/token selection stay intact — the user only needs
 * to re-run the wallet step.
 *
 * @param st - State cluster setters
 * @param depsRef - Latest-deps ref with `releasePayInFlight` / processing flag
 */
function runClearSessionBoundCheckout(
	st: SessionStateCluster,
	depsRef: { current: UseCheckoutSessionDeps },
): void {
	st.setSession(null);
	st.setSessionTokenId(null);
	st.setSessionWalletAddress(null);
	depsRef.current.releasePayInFlight();
	depsRef.current.setIsProcessing(false);
	depsRef.current.applyRuntimeState({
		txHash: undefined,
		txSubmitted: false,
	});
}

interface ReturnToWalletStepRefs {
	clearSessionBoundCheckout: () => void;
	depsRef: { current: UseCheckoutSessionDeps };
}

/**
 * Returns the user to the wallet step when the review session becomes
 * invalid (wallet changed or submit deadline expired).
 *
 * @param reason - Discriminator for the default toast copy
 * @param message - Optional override used when the caller already has a
 *                  backend-specific message (e.g. expired session detail)
 * @param refs - Hook-owned callables
 */
function runReturnToWalletStep(
	reason: 'wallet-changed' | 'session-expired',
	message: string | undefined,
	refs: ReturnToWalletStepRefs,
): void {
	refs.clearSessionBoundCheckout();
	refs.depsRef.current.goToStep('connect-wallet');
	if (message) {
		toast.error(message);
		return;
	}
	toast.info(
		reason === 'wallet-changed'
			? 'Wallet changed. Continue again to refresh this crypto checkout.'
			: 'Checkout session expired. Continue again to refresh this crypto checkout.',
	);
}

interface HydrateCheckoutSessionRefs {
	applySessionState: (params: ApplySessionStateParams) => void;
	applyServerHydration: (
		params: ApplyServerHydrationParams,
	) => 'success' | 'failure' | 'step';
	depsRef: { current: UseCheckoutSessionDeps };
}

/**
 * Hydrates FE state from the backend-owned crypto session.
 *
 * Recovery bridge for refresh/session-resume cases — fetches the
 * authoritative server snapshot and maps it to the matching FE step. Fails
 * open to the review step on session-read error so `handlePay` can still
 * re-verify authoritatively before any wallet prompt.
 *
 * @param params - Session + connected wallet + fallback token + flow version
 * @param refs - Hook-owned callables + latest-deps ref
 * @returns False iff backend signalled a terminal failure, true otherwise
 */
async function runHydrateCheckoutSession(
	params: HydrateCheckoutSessionParams,
	refs: HydrateCheckoutSessionRefs,
): Promise<boolean> {
	const { checkoutSession, checksummedAddress, fallbackToken, flowVersion } =
		params;
	const sessionResult = await getCryptoSession(checkoutSession.id);
	if (!refs.depsRef.current.isPreConfirmingFlowCurrent(flowVersion))
		return false;

	// Session read failed — fall back to review. `handlePay` re-reads the
	// session authoritatively before any wallet prompt, so the FE never
	// broadcasts based only on this stale local snapshot.
	if (!sessionResult.success) {
		refs.applySessionState({
			checkoutSession,
			checksummedAddress,
			token: fallbackToken,
		});
		refs.depsRef.current.applyRuntimeState({
			txHash: undefined,
			txSubmitted: false,
		});
		refs.depsRef.current.goToStep('review');
		return true;
	}

	const nextStep = getHydratedCheckoutStep(sessionResult.data.status);
	const outcome = refs.applyServerHydration({
		serverSession: sessionResult.data,
		checkoutSession,
		checksummedAddress,
		fallbackToken,
		nextStep,
	});
	return outcome !== 'failure';
}

/**
 * Full reset — called by the modal's `handleReset` + `handleClose` paths.
 *
 * @param st - State cluster setters
 */
function runResetSession(st: SessionStateCluster): void {
	st.setSelectedChainId(null);
	st.setSelectedToken(null);
	st.setSession(null);
	st.setSessionTokenId(null);
	st.setSessionWalletAddress(null);
}
