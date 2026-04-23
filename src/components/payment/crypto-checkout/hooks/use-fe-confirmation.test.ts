import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

import {
	handleConfirmationFailure,
	MAX_FE_CONFIRM_RETRIES,
} from '@/components/payment/crypto-checkout/confirmation/fe-confirmation-adapters';
import { PAYMENT_ERROR_CODES } from '@/types/errors';

// ==========================================
// Fixtures
// ==========================================

interface MutableRef<T> {
	current: T;
}

function buildDeps() {
	const setErrorMessageCalls: (string | null)[] = [];
	const goToStepCalls: string[] = [];
	const confirmRetryAttemptsRef: MutableRef<number> = { current: 0 };
	const confirmRetryTimerRef: MutableRef<ReturnType<typeof setTimeout> | null> =
		{ current: null };
	const setConfirmRetryTick = mock(() => {});

	const depsRef = {
		current: {
			setErrorMessage: (v: string | null) => {
				setErrorMessageCalls.push(v);
			},
			goToStep: (step: string) => {
				goToStepCalls.push(step);
			},
		},
	};

	return {
		target: {
			depsRef: depsRef as unknown as Parameters<
				typeof handleConfirmationFailure
			>[1]['depsRef'],
			confirmRetryAttemptsRef,
			confirmRetryTimerRef,
			setConfirmRetryTick: setConfirmRetryTick as unknown as Parameters<
				typeof handleConfirmationFailure
			>[1]['setConfirmRetryTick'],
		},
		spies: {
			setErrorMessageCalls,
			goToStepCalls,
			confirmRetryAttemptsRef,
			confirmRetryTimerRef,
			setConfirmRetryTick,
		},
	};
}

// ==========================================
// Tests
// ==========================================

describe('handleConfirmationFailure', () => {
	beforeEach(() => {
		// Silence console.warn / console.error emitted by the deferred / retry branches.
		spyConsole();
	});
	afterEach(() => {
		restoreConsole();
	});

	describe('terminal branch', () => {
		test('routes session-not-found to failure step with a mapped message', () => {
			const { target, spies } = buildDeps();

			handleConfirmationFailure(
				PAYMENT_ERROR_CODES.CRYPTO_SESSION_NOT_FOUND,
				target,
			);

			expect(spies.goToStepCalls).toEqual(['failure']);
			expect(spies.setErrorMessageCalls.length).toBe(1);
			expect(spies.setErrorMessageCalls[0]).not.toBeNull();
			expect(spies.confirmRetryTimerRef.current).toBeNull();
		});

		test('routes session-expired to failure step', () => {
			const { target, spies } = buildDeps();

			handleConfirmationFailure(
				PAYMENT_ERROR_CODES.CRYPTO_SESSION_EXPIRED,
				target,
			);

			expect(spies.goToStepCalls).toEqual(['failure']);
		});
	});

	describe('deferred branch', () => {
		test('does not schedule a retry when the backend signals already-completed', () => {
			// Already-completed means the cron already finalized — polling picks up the
			// success in the very next tick, so kicking off an FE retry is just noise.
			const { target, spies } = buildDeps();

			handleConfirmationFailure(
				PAYMENT_ERROR_CODES.CRYPTO_ALREADY_COMPLETED,
				target,
			);

			expect(spies.goToStepCalls.length).toBe(0);
			expect(spies.confirmRetryTimerRef.current).toBeNull();
			expect(spies.confirmRetryAttemptsRef.current).toBe(0);
		});
	});

	describe('retryable branch', () => {
		test('schedules a 5s retry timer and bumps the attempts counter', () => {
			const { target, spies } = buildDeps();

			handleConfirmationFailure(
				PAYMENT_ERROR_CODES.CRYPTO_CONFIRM_FAILED,
				target,
			);

			expect(spies.confirmRetryAttemptsRef.current).toBe(1);
			expect(spies.confirmRetryTimerRef.current).not.toBeNull();
			// clean up to keep the global timer table clean across tests
			if (spies.confirmRetryTimerRef.current) {
				clearTimeout(spies.confirmRetryTimerRef.current);
			}
		});

		test('stops scheduling once the retry cap is reached', () => {
			const { target, spies } = buildDeps();
			spies.confirmRetryAttemptsRef.current = MAX_FE_CONFIRM_RETRIES;

			handleConfirmationFailure(
				PAYMENT_ERROR_CODES.CRYPTO_CONFIRM_FAILED,
				target,
			);

			expect(spies.confirmRetryAttemptsRef.current).toBe(
				MAX_FE_CONFIRM_RETRIES,
			);
			expect(spies.confirmRetryTimerRef.current).toBeNull();
		});
	});
});

// ==========================================
// Console silencers — avoid noisy test output from the deferred/retry branches
// ==========================================

const originalWarn = console.warn;
const originalError = console.error;

function spyConsole(): void {
	console.warn = () => {};
	console.error = () => {};
}

function restoreConsole(): void {
	console.warn = originalWarn;
	console.error = originalError;
}
