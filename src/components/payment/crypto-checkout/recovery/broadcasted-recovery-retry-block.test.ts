import { describe, expect, test } from 'bun:test';

import { CRYPTO_TX_SUBMIT_OUTCOME } from '@/lib/web3/payment/crypto-payment-flow';

import { buildBroadcastedRecoveryPlan } from './recovery-plan';

// ==========================================
// Tests
// ==========================================

describe('buildBroadcastedRecoveryPlan — Pay-button-disabled invariant', () => {
	test('plan requires retryBlocked=true to keep Pay disabled while funds in-flight', () => {
		// CONTRACT: `runHandlePay`'s catch block fires `setIsProcessing(false)`
		// BEFORE `applyPayErrorClassification` routes into the broadcasted-
		// recovery branch. The broadcasted-recovery handler therefore MUST
		// compensate by latching `retryBlocked(true)` — otherwise the user
		// can click Pay again while the on-chain tx is still being tracked,
		// which leads to a double-payment hazard.
		const plan = buildBroadcastedRecoveryPlan();

		// Invariant pinned: retryBlocked must be latched high.
		expect(plan.retryBlocked).toBe(true);
	});

	test('plan selects RETRY submit-recovery so polling reconciles with backend', () => {
		// Funds are in flight on-chain. The submit-recovery effect must
		// retry the POST /crypto/submit call once, then fall through to
		// backend polling for reconciliation.
		const plan = buildBroadcastedRecoveryPlan();

		expect(plan.submitRecoveryMode).toBe(CRYPTO_TX_SUBMIT_OUTCOME.RETRY);
	});
});
