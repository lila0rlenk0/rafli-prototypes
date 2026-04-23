'use client';

import { useCallback, useEffect, useRef } from 'react';

// ==========================================
// Types
// ==========================================

/**
 * Result of a successful in-flight guard claim.
 *
 * `release` MUST be called when the guarded operation terminates (success,
 * failure, early-return, or throw). Leaking a `true` in the ref would make
 * the guarded handler permanently no-op until the modal is reset.
 */
export interface GuardClaim {
	ok: true;
	release: () => void;
}

/** Result when another caller already holds the in-flight ref. */
export interface GuardRejection {
	ok: false;
}

export type GuardResult = GuardClaim | GuardRejection;

/** Mutable ref surface a guard claim needs to read and flip. */
export interface InFlightRef {
	current: boolean;
}

/**
 * Operations returned by `useCheckoutFlowGuards`.
 *
 * Identity is stable across renders so consumers can safely include
 * individual ops in hook dep lists without forcing re-creation.
 */
export interface CheckoutFlowGuardsApi {
	/** Attempt to claim the pay-flow in-flight ref. Fails when already held. */
	guardPay: () => GuardResult;
	/** Attempt to claim the wallet-ready in-flight ref. Fails when already held. */
	guardWalletReady: () => GuardResult;
	/** Bumps the pre-confirming flow version + releases wallet-ready lock. Returns the new snapshot. */
	invalidatePreConfirmingFlow: () => number;
	/** Live flow-version snapshot for async closures. */
	getCurrentFlowVersion: () => number;
	/** Returns `current + 1` without mutating — handlers capture + commit it. */
	reserveNextFlowVersion: () => number;
	/** Commits a reserved flow version. */
	commitFlowVersion: (version: number) => void;
	/** Starts a delayed reset timer, clearing any existing one first. */
	scheduleCloseReset: (delayMs: number, cb: () => void) => void;
	/** Clears any pending close-reset timer. Safe when no timer is scheduled. */
	clearCloseReset: () => void;
	/** Releases both in-flight ref guards — used by the modal's `handleReset`. */
	releaseInFlightGuards: () => void;
}

// ==========================================
// Pure helper (module scope, testable)
// ==========================================

/**
 * Pure assert-and-claim: if the ref is already true the caller loses the
 * race; otherwise flip the ref and hand back a `release` that restores it.
 *
 * Callers own the release lifecycle (exactly one call per successful
 * claim, typically in `finally`). A second release is still harmless.
 *
 * @param ref - In-flight ref to guard
 * @returns `GuardClaim` on success, `GuardRejection` when already held
 */
export function claimInFlightRef(ref: InFlightRef): GuardResult {
	if (ref.current) return { ok: false };
	ref.current = true;
	return {
		ok: true,
		release() {
			ref.current = false;
		},
	};
}

// ==========================================
// Hook
// ==========================================

/**
 * Bundles the four race-prevention refs that were previously in the
 * modal's component scope (`payInFlight`, `walletReadyInFlight`,
 * `preConfirmingFlowVersion`, `closeResetTimeout`).
 *
 * Each returned callable wraps `useCallback` with `[]` deps so its
 * identity is stable across renders — consumers can put individual ops
 * in `useCallback` / `useEffect` dep arrays without thrash.
 *
 * @returns Named guard operations — see `CheckoutFlowGuardsApi`
 */
export function useCheckoutFlowGuards(): CheckoutFlowGuardsApi {
	const payInFlight = useRef(false);
	const walletReadyInFlight = useRef(false);
	// Incremented once per bootstrap attempt (wallet-ready or close-driven
	// invalidation). Async closures captured at entry re-check via
	// `getCurrentFlowVersion` after every `await` — that re-check is the
	// double-payment safeguard the plan's Risks section flags.
	const flowVersion = useRef(0);
	const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const guardPay = useCallback(() => claimInFlightRef(payInFlight), []);
	const guardWalletReady = useCallback(
		() => claimInFlightRef(walletReadyInFlight),
		[],
	);
	const getCurrentFlowVersion = useCallback(() => flowVersion.current, []);
	const reserveNextFlowVersion = useCallback(() => flowVersion.current + 1, []);
	const commitFlowVersion = useCallback((v: number) => {
		flowVersion.current = v;
	}, []);
	const invalidatePreConfirmingFlow = useCallback(() => {
		flowVersion.current += 1;
		walletReadyInFlight.current = false;
		return flowVersion.current;
	}, []);
	const clearCloseReset = useCallback(() => {
		if (closeTimer.current) {
			clearTimeout(closeTimer.current);
			closeTimer.current = null;
		}
	}, []);
	const scheduleCloseReset = useCallback(
		(delayMs: number, cb: () => void) => {
			clearCloseReset();
			closeTimer.current = setTimeout(() => {
				closeTimer.current = null;
				cb();
			}, delayMs);
		},
		[clearCloseReset],
	);
	const releaseInFlightGuards = useCallback(() => {
		payInFlight.current = false;
		walletReadyInFlight.current = false;
	}, []);

	// Unmount safety net — clears the close-reset timer even when the
	// parent yanks this component without routing through
	// `handleClose`/`handleReset` (navigation, error-boundary unmount,
	// parent conditional render flip).
	useEffect(() => () => clearCloseReset(), [clearCloseReset]);

	return {
		guardPay,
		guardWalletReady,
		invalidatePreConfirmingFlow,
		getCurrentFlowVersion,
		reserveNextFlowVersion,
		commitFlowVersion,
		scheduleCloseReset,
		clearCloseReset,
		releaseInFlightGuards,
	};
}
