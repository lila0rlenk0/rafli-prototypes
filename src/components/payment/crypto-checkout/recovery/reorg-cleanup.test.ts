import { describe, expect, test } from 'bun:test';
import type { RefObject } from 'react';

import type { UseFeConfirmationDeps } from '@/components/payment/crypto-checkout/hooks/use-fe-confirmation';
import { runReorgCheck } from '@/components/payment/crypto-checkout/hooks/use-fe-confirmation';

// ==========================================
// Fixtures
// ==========================================

const SESSION_FIXTURE = {
	id: 'session_reorg',
	amount: '10',
	walletAddress: '0x1234567890AbCdEf1234567890aBcDeF12345678',
	amountRaw: '10000000',
	chainId: 8_453,
	tokenAddress: '0x1234567890AbCdEf1234567890aBcDeF12345678',
	treasuryAddress: '0x1234567890AbCdEf1234567890aBcDeF12345678',
	orderId: 'order_reorg',
	expiresAt: '2099-01-01T00:00:00.000Z',
	submitDeadline: '2099-01-01T00:00:00.000Z',
	confirmDeadline: '2099-01-01T00:01:00.000Z',
	confirmationTarget: 12,
} as const;

// ==========================================
// Harness
// ==========================================

interface Recorder {
	errorMessageCalls: (string | null)[];
	fundsAtRiskCalls: boolean[];
	goToStepCalls: ('failure' | 'success')[];
}

interface DeferredBalance {
	promise: Promise<{ data: bigint | undefined }>;
	resolve: (value: { data: bigint | undefined }) => void;
}

/** Pending promise the test can resolve at will — lets us race unmount against resolution. */
function buildDeferredBalance(): DeferredBalance {
	let resolve!: (value: { data: bigint | undefined }) => void;
	const promise = new Promise<{ data: bigint | undefined }>(res => {
		resolve = res;
	});
	return { promise, resolve };
}

/**
 * Minimal `UseFeConfirmationDeps` wired only for the reorg flow. The
 * cast through the shared deps type is safe here: `runReorgCheck` only
 * reads `refetchConfirmingBalance`, `session`, `setErrorMessage`,
 * `setFundsAtRisk`, and `goToStep` — other fields never execute.
 */
function buildDeps(
	deferred: DeferredBalance,
	rec: Recorder,
): UseFeConfirmationDeps {
	return {
		refetchConfirmingBalance: () => deferred.promise,
		session: SESSION_FIXTURE,
		setErrorMessage: (v: string | null) => {
			rec.errorMessageCalls.push(v);
		},
		setFundsAtRisk: (v: boolean) => {
			rec.fundsAtRiskCalls.push(v);
		},
		goToStep: (s: 'failure' | 'success') => {
			rec.goToStepCalls.push(s);
		},
	} as unknown as UseFeConfirmationDeps;
}

// ==========================================
// Tests
// ==========================================

describe('runReorgCheck — unmount cleanup', () => {
	test('skips all post-await state writes when caller unmounted mid-await', async () => {
		// CONTRACT: `runReorgCheck` awaits `refetchConfirmingBalance()`,
		// which can take an arbitrary amount of time (RPC round-trip). If
		// the modal closes mid-await, any `depsRef.current.*` setter fires
		// on an unmounted tree — the symptom chain:
		//   1. `setErrorMessage` / `setFundsAtRisk` / `goToStep` emit an
		//      update on a hook whose owner has already unmounted.
		//   2. React logs "memory leak" warnings in dev; in prod the
		//      setters are swallowed but the fallback message sticks
		//      through the next mount.
		// A `mountedRef` checked after each await fixes both.
		const rec: Recorder = {
			errorMessageCalls: [],
			fundsAtRiskCalls: [],
			goToStepCalls: [],
		};
		const deferred = buildDeferredBalance();
		const depsRef = {
			current: buildDeps(deferred, rec),
		} as RefObject<UseFeConfirmationDeps>;
		const reorgHandled: RefObject<boolean> = { current: true };
		const mountedRef: RefObject<boolean> = { current: true };

		const promise = runReorgCheck({ depsRef, reorgHandled, mountedRef });

		// Simulate modal close BEFORE the balance probe resolves.
		mountedRef.current = false;

		// Resolve with ambiguous "funds deducted" balance (0 < 10_000_000):
		// this is the branch that would set `fundsAtRisk(true)` and route
		// to `failure`. The mountedRef check MUST short-circuit instead.
		deferred.resolve({ data: 0n });
		await promise;

		// No setters fire post-unmount.
		expect(rec.errorMessageCalls.length).toBe(0);
		expect(rec.fundsAtRiskCalls.length).toBe(0);
		expect(rec.goToStepCalls.length).toBe(0);
	});

	test('applies writes normally when the caller is still mounted', async () => {
		// Negative baseline — happy path fires the full sequence unchanged.
		const rec: Recorder = {
			errorMessageCalls: [],
			fundsAtRiskCalls: [],
			goToStepCalls: [],
		};
		const deferred = buildDeferredBalance();
		const depsRef = {
			current: buildDeps(deferred, rec),
		} as RefObject<UseFeConfirmationDeps>;
		const reorgHandled: RefObject<boolean> = { current: true };
		const mountedRef: RefObject<boolean> = { current: true };

		const promise = runReorgCheck({ depsRef, reorgHandled, mountedRef });
		// Funds fully available — "funds-safe" branch.
		deferred.resolve({ data: 999_999_999n });
		await promise;

		expect(rec.errorMessageCalls.length).toBe(1);
		expect(rec.fundsAtRiskCalls.length).toBe(0);
		expect(rec.goToStepCalls).toEqual(['failure']);
	});
});
