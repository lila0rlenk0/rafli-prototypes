import { CRYPTO_TX_SUBMIT_OUTCOME } from '@/lib/web3/payment/crypto-payment-flow';

import type { SubmitRecoveryMode } from '@/components/payment/crypto-checkout/hooks/use-tx-tracking-types';

// ==========================================
// Types
// ==========================================

/**
 * Declarative description of the tx-tracking state writes that the
 * broadcasted-recovery error handler must apply. Kept as a plain object
 * so the derivation is pure and unit-testable without mounting the
 * handler hook or pulling Sentry/env into the test graph.
 */
export interface BroadcastedRecoveryPlan {
	/** RETRY so the submit-recovery effect + polling reconcile with backend. */
	submitRecoveryMode: SubmitRecoveryMode;
	/**
	 * Must be `true` — `runHandlePay`'s catch block already fired
	 * `setIsProcessing(false)` BEFORE this plan runs. Without this flag,
	 * the Pay button re-enables while on-chain funds are still being
	 * tracked — a double-payment hazard if the user navigates back to
	 * review or recovery routes them there.
	 */
	retryBlocked: boolean;
}

// ==========================================
// Derivation
// ==========================================

/**
 * Derives the tx-tracking writes required when `handlePay` throws AFTER
 * a tx hash has been broadcast on-chain.
 *
 * Pure by design — the caller (handler in `use-checkout-actions.ts`)
 * applies the writes and fires the Sentry capture separately.
 *
 * @returns Plan the caller must apply to hold the Pay button disabled
 *   for the duration of the submit-recovery reconciliation
 */
export function buildBroadcastedRecoveryPlan(): BroadcastedRecoveryPlan {
	return {
		submitRecoveryMode: CRYPTO_TX_SUBMIT_OUTCOME.RETRY,
		// Latch high — `runHandlePay` already called `setIsProcessing(false)`
		// before routing here, so without this flag the Pay button re-enables
		// while the broadcasted tx is still tracked on-chain.
		retryBlocked: true,
	};
}
