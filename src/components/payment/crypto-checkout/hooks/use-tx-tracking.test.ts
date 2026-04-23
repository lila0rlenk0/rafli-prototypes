import { describe, expect, mock, test } from 'bun:test';

import {
	applyTxTrackingPatch,
	type ApplyRuntimeStateParams,
} from '@/components/payment/crypto-checkout/confirmation/tx-runtime-merge';
import type {
	ReplacementReason,
	SubmitRecoveryMode,
} from './use-tx-tracking-types';

// ==========================================
// Helpers
// ==========================================

interface MutableRef<T> {
	current: T;
}

/**
 * Build a fresh mutation target mirroring the ref + setter surface the
 * real hook passes in. Returns plain mocks so assertions can inspect
 * both the final ref values and the setter invocation sequence.
 */
function buildTarget() {
	const txHashCalls: (`0x${string}` | undefined)[] = [];
	const txSubmittedCalls: boolean[] = [];
	const submitRecoveryModeCalls: SubmitRecoveryMode[] = [];
	const retryBlockedCalls: boolean[] = [];
	const errorMessageCalls: (string | null)[] = [];
	const fundsAtRiskCalls: boolean[] = [];

	const submitRequestInFlight: MutableRef<boolean> = { current: true };
	const submitRetriedHashes: MutableRef<Set<string>> = {
		current: new Set(['0xdead']),
	};
	const lastReplacementReason: MutableRef<null | ReplacementReason> = {
		current: 'replaced',
	};
	const backendTrackedTxHash: MutableRef<string | null> = { current: '0xold' };
	const txSubmittedToBackend: MutableRef<boolean> = { current: true };

	const resetSendTransaction = mock(() => {});
	const resetFeConfirmation = mock(() => {});

	return {
		target: {
			setTxHash: (v: `0x${string}` | undefined) => {
				txHashCalls.push(v);
			},
			setTxSubmitted: (v: boolean) => {
				txSubmittedCalls.push(v);
			},
			setSubmitRecoveryMode: (v: SubmitRecoveryMode) => {
				submitRecoveryModeCalls.push(v);
			},
			setRetryBlocked: (v: boolean) => {
				retryBlockedCalls.push(v);
			},
			setErrorMessage: (v: string | null) => {
				errorMessageCalls.push(v);
			},
			setFundsAtRisk: (v: boolean) => {
				fundsAtRiskCalls.push(v);
			},
			submitRequestInFlight,
			submitRetriedHashes,
			lastReplacementReason,
			backendTrackedTxHash,
			txSubmittedToBackend,
			resetSendTransaction,
			resetFeConfirmation,
		},
		spies: {
			txHashCalls,
			txSubmittedCalls,
			submitRecoveryModeCalls,
			retryBlockedCalls,
			errorMessageCalls,
			fundsAtRiskCalls,
			submitRequestInFlight,
			submitRetriedHashes,
			lastReplacementReason,
			backendTrackedTxHash,
			txSubmittedToBackend,
			resetSendTransaction,
			resetFeConfirmation,
		},
	};
}

// ==========================================
// Tests
// ==========================================

describe('applyTxTrackingPatch', () => {
	describe('defaults', () => {
		test('resets refs + setters to the initial "no tx, no session" baseline', () => {
			const { target, spies } = buildTarget();

			const params: ApplyRuntimeStateParams = {
				txHash: undefined,
				txSubmitted: false,
			};
			applyTxTrackingPatch(params, target);

			expect(spies.txHashCalls).toEqual([undefined]);
			expect(spies.txSubmittedCalls).toEqual([false]);
			expect(spies.submitRecoveryModeCalls).toEqual([null]);
			expect(spies.retryBlockedCalls).toEqual([false]);
			expect(spies.errorMessageCalls).toEqual([null]);
			expect(spies.fundsAtRiskCalls).toEqual([false]);
			expect(spies.submitRequestInFlight.current).toBe(false);
			expect(spies.submitRetriedHashes.current.size).toBe(0);
			expect(spies.lastReplacementReason.current).toBeNull();
			expect(spies.backendTrackedTxHash.current).toBeNull();
			expect(spies.txSubmittedToBackend.current).toBe(false);
			expect(spies.resetSendTransaction).toHaveBeenCalledTimes(1);
			expect(spies.resetFeConfirmation).toHaveBeenCalledTimes(1);
		});
	});

	describe('hydration path (server-owned tx)', () => {
		test('normalizes backendTrackedHash to lowercase and marks backend ownership', () => {
			const { target, spies } = buildTarget();

			applyTxTrackingPatch(
				{
					txHash: '0xAbC',
					txSubmitted: true,
					backendTrackedHash:
						'0xAbC1230000000000000000000000000000000000000000000000000000000001',
					backendOwnsTx: true,
				},
				target,
			);

			expect(spies.backendTrackedTxHash.current).toBe(
				'0xabc1230000000000000000000000000000000000000000000000000000000001',
			);
			expect(spies.txSubmittedToBackend.current).toBe(true);
		});
	});

	describe('failure path', () => {
		test('pipes fundsAtRisk + retryBlocked + errorMessage through to setters', () => {
			const { target, spies } = buildTarget();

			applyTxTrackingPatch(
				{
					txHash: undefined,
					txSubmitted: false,
					fundsAtRisk: true,
					retryBlocked: true,
					errorMessage: 'boom',
				},
				target,
			);

			expect(spies.fundsAtRiskCalls).toEqual([true]);
			expect(spies.retryBlockedCalls).toEqual([true]);
			expect(spies.errorMessageCalls).toEqual(['boom']);
		});
	});

	describe('fe-confirmation reset delegation', () => {
		test('invokes resetFeConfirmation exactly once per apply', () => {
			const { target, spies } = buildTarget();

			applyTxTrackingPatch({ txHash: undefined, txSubmitted: false }, target);
			applyTxTrackingPatch({ txHash: undefined, txSubmitted: false }, target);

			expect(spies.resetFeConfirmation).toHaveBeenCalledTimes(2);
		});
	});
});
