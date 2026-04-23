import type { Address } from 'viem';

import type { RevalidatedServerSession } from '@/components/payment/crypto-checkout/session/pay-session-revalidate';
import type { ApplyServerHydrationParams } from '@/components/payment/crypto-checkout/session/use-checkout-session';
import type { RaffleCryptoToken } from '@/types/raffle';
import type { CryptoCheckoutSession } from '@/types/wallet';

import type { HydratedCheckoutStep } from '@/components/payment/crypto-checkout/session/session-guards';

// ==========================================
// Types
// ==========================================

/**
 * Caller-side contract for the rehydrate branch.
 *
 * Kept narrow so the pure helper never pulls in the full
 * `UseCheckoutActionsParams` type (which would drag Sentry / env into
 * the unit-test graph).
 */
export interface RunPayRehydrateArgs {
	/** Flow version captured at handler entry (pre-await). */
	capturedFlowVersion: number;
	/** Reads the current flow-version ref (post-await re-check). */
	getCurrentFlowVersion: () => number;
	refreshedSession: RevalidatedServerSession;
	sessionData: CryptoCheckoutSession;
	checksummedAddress: Address;
	fallbackToken: RaffleCryptoToken;
	nextStep: ApplyServerHydrationParams['nextStep'] | HydratedCheckoutStep;
	/** Server-hydration side effect — invoked iff flow-version is current. */
	applyServerHydration: (params: ApplyServerHydrationParams) => unknown;
	/** Always fires — release the pay guard on both `applied` and `skipped`. */
	releasePayInFlight: () => void;
	/** Always fires — clear the processing flag on both outcomes. */
	setIsProcessing: (v: boolean) => void;
}

/**
 * Outcome the caller routes back into its overall pay-revalidation
 * switch. Both arms return `'return'` — after the rehydrate branch the
 * pay flow never continues to broadcast.
 */
export type RunPayRehydrateOutcome = 'applied' | 'skipped';

// ==========================================
// Runner
// ==========================================

/**
 * Runs the rehydrate branch of the pay revalidation outcome.
 *
 * Why this exists: `revalidateSessionBeforePay` awaits a backend read.
 * Between the await starting and the rehydrate branch firing, a parallel
 * `handleClose` can bump the pre-confirming flow-version ref (see
 * `invalidatePreConfirmingFlow` in `use-flow-guards.ts`). If the
 * caller blindly calls `applyServerHydration` with the new server state,
 * it lands on a modal the user already dismissed — ghost setters fire on
 * an unmounted tree AND the review step is repopulated with the now-
 * abandoned session.
 *
 * This helper mirrors the `flow-stale` outcome that
 * `handleWalletReadyEnsureVerified` already returns for the wallet-ready
 * path — same invariant, same guard shape.
 *
 * @param args - Flow-version refs, backend snapshot, side-effect callables
 * @returns `'applied'` when hydration ran, `'skipped'` when stale
 */
export function runPayRehydrateBranch(
	args: RunPayRehydrateArgs,
): RunPayRehydrateOutcome {
	// Always release the in-flight guard and clear the processing flag —
	// regardless of whether we hydrate, the pay attempt is done.
	const cleanup = (): void => {
		args.releasePayInFlight();
		args.setIsProcessing(false);
	};

	// Post-await flow-version re-check. Between the await on
	// `revalidateSessionBeforePay` and this branch firing, a parallel
	// `handleClose` can bump the pre-confirming flow-version ref. If
	// drifted, writing hydrated state lands on a dismissed modal —
	// ghost setters fire on an unmounted tree and the review step is
	// re-armed for a session the user abandoned.
	if (args.getCurrentFlowVersion() !== args.capturedFlowVersion) {
		cleanup();
		return 'skipped';
	}

	args.applyServerHydration({
		serverSession: args.refreshedSession,
		checkoutSession: args.sessionData,
		checksummedAddress: args.checksummedAddress,
		fallbackToken: args.fallbackToken,
		nextStep: args.nextStep as ApplyServerHydrationParams['nextStep'],
	});
	cleanup();
	return 'applied';
}
