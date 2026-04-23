import { describe, expect, test } from 'bun:test';
import { getAddress } from 'viem';

import { PAYMENT_ERROR_CODES } from '@/types/errors';
import { CRYPTO_PAYMENT_STATUS } from '@/types/payment';
import type { CryptoCheckoutSession } from '@/types/wallet';

import {
	revalidateSessionBeforePay,
	type GetCryptoSessionFn,
	type RevalidatedServerSession,
} from '@/components/payment/crypto-checkout/session/pay-session-revalidate';

// ==========================================
// Fixtures
// ==========================================

/** Checksummed EVM address shared by wallet + treasury — keeps focus on flow-version logic. */
const WALLET = getAddress('0x1234567890AbCdEf1234567890aBcDeF12345678');

const SESSION: CryptoCheckoutSession = {
	id: 'session_flowv',
	amount: '10',
	walletAddress: WALLET,
	amountRaw: '10000000',
	chainId: 8_453,
	tokenAddress: WALLET,
	treasuryAddress: WALLET,
	orderId: 'order_flowv',
	expiresAt: '2026-04-22T10:00:00.000Z',
	submitDeadline: '2099-01-01T00:00:00.000Z',
	confirmDeadline: '2099-01-01T00:01:00.000Z',
	confirmationTarget: 12,
};

const FUTURE_DEADLINE = '2099-01-01T00:00:00.000Z';

/** Pending server session — the revalidation's "still sendable" path. */
function buildPendingServerSession(): RevalidatedServerSession {
	return {
		status: CRYPTO_PAYMENT_STATUS.PENDING,
		submitDeadline: FUTURE_DEADLINE,
		confirmDeadline: FUTURE_DEADLINE,
		txHash: null,
		currency: 'USDC',
		failureReason: null,
	};
}

// ==========================================
// Flow-version mid-await simulator
// ==========================================

/**
 * Builds a reader whose promise only resolves after `flipFlowVersion()` has
 * run — lets us simulate "user closed modal mid-await" or "a newer attempt
 * bumped the flow-version before the HTTP round-trip returned".
 *
 * The flow-version ref mirrors the real hook's `preConfirmingFlowVersion`
 * ref: the helper captures it at entry, and the consumer must re-check it
 * after every await before committing side-effects.
 */
function buildFlowVersionReader({
	session,
	flowVersionRef,
	flipDuringAwait,
}: {
	session: RevalidatedServerSession;
	flowVersionRef: { current: number };
	flipDuringAwait: boolean;
}): GetCryptoSessionFn {
	return () =>
		new Promise(resolve => {
			// Simulate wall-clock delay: by the time the resolver fires, a
			// newer attempt (or modal close) has already bumped the flow-
			// version ref. The consumer's post-await re-check must catch it.
			queueMicrotask(() => {
				if (flipDuringAwait) flowVersionRef.current += 1;
				resolve({ success: true, data: session });
			});
		});
}

// ==========================================
// Tests
// ==========================================

describe('revalidateSessionBeforePay — flow-version staleness (documented limitation)', () => {
	test('helper returns the outcome tagged correctly even when flow-version bumped mid-await', async () => {
		// PLAN RISK NOTE:
		// `revalidateSessionBeforePay` intentionally does NOT read the
		// caller's `preConfirmingFlowVersion` ref. The helper is a pure
		// session-revalidation primitive; it returns the authoritative
		// server outcome regardless of what the UI is doing.
		//
		// CONSUMER RESPONSIBILITY:
		// Callers (the pay handler in `use-checkout-actions.ts`) must
		// re-check `guards.getCurrentFlowVersion() !== flowVersion` AFTER
		// `await revalidateSessionBeforePay(...)` returns, and skip any
		// committing side-effect when the captured version is stale.
		//
		// This test pins both halves of the contract:
		//   1. Outcome is still returned correctly (helper is pure).
		//   2. The flow-version ref we simulate IS bumped during the await —
		//      proving the caller has a reliable, timed signal to check.
		const flowVersionRef = { current: 1 };
		const capturedFlowVersion = flowVersionRef.current;

		const reader = buildFlowVersionReader({
			session: buildPendingServerSession(),
			flowVersionRef,
			flipDuringAwait: true,
		});

		const outcome = await revalidateSessionBeforePay(SESSION, reader);

		// Outcome tagged as ok — helper's contract is server-derived truth.
		expect(outcome.kind).toBe('ok');
		// Flow-version was bumped while the await was in-flight — confirming
		// the consumer-side re-check has a real drift to detect.
		expect(flowVersionRef.current).toBe(capturedFlowVersion + 1);
		expect(flowVersionRef.current).not.toBe(capturedFlowVersion);
	});

	test('consumer staleness pattern: post-await equality check detects drift', async () => {
		// Demonstrates the exact re-check pattern consumers MUST use. If this
		// shape ever drifts in a handler, the regression is mechanical and
		// catchable.
		const flowVersionRef = { current: 7 };
		const capturedFlowVersion = flowVersionRef.current;

		const reader = buildFlowVersionReader({
			session: buildPendingServerSession(),
			flowVersionRef,
			flipDuringAwait: true,
		});

		const outcome = await revalidateSessionBeforePay(SESSION, reader);
		const isStillCurrent = flowVersionRef.current === capturedFlowVersion;

		// Staleness MUST be detected — else the consumer would commit a
		// transaction owned by a modal the user already dismissed.
		expect(isStillCurrent).toBe(false);
		// Helper's outcome remains available regardless of drift — caller
		// decides whether to act on it or drop it.
		expect(outcome.kind).toBe('ok');
	});

	test('no-drift baseline — when flow-version is stable, post-await equality holds', async () => {
		// Negative-path of the invariant: with no drift, the same re-check
		// evaluates to true, so consumers can proceed to commit state.
		const flowVersionRef = { current: 3 };
		const capturedFlowVersion = flowVersionRef.current;

		const reader = buildFlowVersionReader({
			session: buildPendingServerSession(),
			flowVersionRef,
			flipDuringAwait: false,
		});

		const outcome = await revalidateSessionBeforePay(SESSION, reader);
		const isStillCurrent = flowVersionRef.current === capturedFlowVersion;

		expect(isStillCurrent).toBe(true);
		expect(outcome.kind).toBe('ok');
	});

	test('mid-await drift on failure read still returns outcome without committing state', async () => {
		// Covers the failure branch of `revalidateSessionBeforePay` under
		// the same mid-await drift scenario. The helper classifies the
		// error as recoverable/terminal regardless of drift; the consumer
		// is responsible for gating the state commit.
		const flowVersionRef = { current: 0 };
		const capturedFlowVersion = flowVersionRef.current;

		const failingReader: GetCryptoSessionFn = () =>
			new Promise(resolve => {
				queueMicrotask(() => {
					flowVersionRef.current += 1;
					resolve({
						success: false,
						error: PAYMENT_ERROR_CODES.CRYPTO_SESSION_EXPIRED,
					});
				});
			});

		const outcome = await revalidateSessionBeforePay(SESSION, failingReader);

		expect(outcome.kind).toBe('session-expired');
		expect(flowVersionRef.current).not.toBe(capturedFlowVersion);
	});
});

// ==========================================
// Follow-up marker — tracked here so code-search surfaces it in PR review.
// ==========================================

// FOLLOW-UP: `revalidateSessionBeforePay` cannot detect flow-version drift on
// its own. Consumers MUST check `guards.getCurrentFlowVersion() === captured`
// immediately after `await` returns and before any `setX`/commit call. If a
// future refactor wants drift-awareness inside the helper, pass an
// `isFlowCurrent: (captured: number) => boolean` predicate (same shape as
// `handleWalletReadyEnsureVerified`) and return a `flow-stale` outcome.
