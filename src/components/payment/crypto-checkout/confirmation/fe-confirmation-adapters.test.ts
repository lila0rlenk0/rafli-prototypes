import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import { getPaymentErrorMessage } from '@/lib/checkout/error-messages';
import { PAYMENT_ERROR_CODES } from '@/types/errors';

import {
	handleConfirmationFailure,
	MAX_FE_CONFIRM_RETRIES,
	REORG_FUNDS_AT_RISK_MESSAGE,
	REORG_FUNDS_SAFE_MESSAGE,
	REORG_NO_SESSION_MESSAGE,
	type HandleConfirmationFailureDeps,
} from './fe-confirmation-adapters';

// ==========================================
// Module-scope fixtures
// ==========================================

/**
 * Below-budget retry attempt counts — every legal state before the retry cap
 * still schedules a new timer and bumps the attempts counter.
 */
const BELOW_BUDGET_ATTEMPTS: readonly number[] = [
	0,
	1,
	MAX_FE_CONFIRM_RETRIES - 1,
];

/**
 * At-or-above-budget attempt counts — the helper must refuse to schedule and
 * leave the counter untouched so polling owns the eventual convergence.
 */
const CAP_OR_BEYOND_ATTEMPTS: readonly number[] = [
	MAX_FE_CONFIRM_RETRIES,
	MAX_FE_CONFIRM_RETRIES + 1,
	MAX_FE_CONFIRM_RETRIES + 10,
];

/** Terminal confirm error codes — each must route straight to the failure step. */
const TERMINAL_CONFIRM_ERRORS = [
	PAYMENT_ERROR_CODES.CRYPTO_SESSION_EXPIRED,
	PAYMENT_ERROR_CODES.CRYPTO_SESSION_NOT_FOUND,
	PAYMENT_ERROR_CODES.CRYPTO_ORDER_NOT_RECOVERABLE,
] as const;

/**
 * Convergence codes — cron / polling owns the eventual transition, so the
 * helper must log + defer instead of dogpiling the backend with retries.
 */
const DEFERRED_CONFIRM_ERRORS = [
	PAYMENT_ERROR_CODES.CRYPTO_ALREADY_COMPLETED,
	PAYMENT_ERROR_CODES.CRYPTO_ALREADY_CONFIRMING,
	PAYMENT_ERROR_CODES.CRYPTO_CONCURRENT_UPDATE,
	PAYMENT_ERROR_CODES.CRYPTO_CONCURRENT_COMPLETION,
] as const;

// ==========================================
// Test harness — plain recorders, no mock.module
// ==========================================

interface MutableRef<T> {
	current: T;
}

interface Recorders {
	setErrorMessageCalls: (string | null)[];
	goToStepCalls: string[];
	confirmRetryAttemptsRef: MutableRef<number>;
	confirmRetryTimerRef: MutableRef<ReturnType<typeof setTimeout> | null>;
	setConfirmRetryTickCalls: number;
}

interface Harness {
	target: HandleConfirmationFailureDeps;
	rec: Recorders;
}

/** Harness factory — plain closures so no timer actually has to fire. */
function buildHarness(initialAttempts = 0): Harness {
	const rec: Recorders = {
		setErrorMessageCalls: [],
		goToStepCalls: [],
		confirmRetryAttemptsRef: { current: initialAttempts },
		confirmRetryTimerRef: { current: null },
		setConfirmRetryTickCalls: 0,
	};

	const target: HandleConfirmationFailureDeps = {
		depsRef: {
			current: {
				setErrorMessage(v) {
					rec.setErrorMessageCalls.push(v);
				},
				goToStep(step) {
					rec.goToStepCalls.push(step);
				},
			},
		},
		confirmRetryAttemptsRef: rec.confirmRetryAttemptsRef,
		confirmRetryTimerRef: rec.confirmRetryTimerRef,
		setConfirmRetryTick() {
			rec.setConfirmRetryTickCalls += 1;
		},
	};

	return { target, rec };
}

/**
 * Clears any timer the retryable branch may have scheduled during a test so
 * bun's global timer table stays clean between tests.
 */
function clearScheduledTimer(rec: Recorders): void {
	if (rec.confirmRetryTimerRef.current) {
		clearTimeout(rec.confirmRetryTimerRef.current);
		rec.confirmRetryTimerRef.current = null;
	}
}

// ==========================================
// Console silencers — deferred + retryable branches log intentionally
// ==========================================

const originalWarn = console.warn;
const originalError = console.error;

function silenceConsole(): void {
	console.warn = () => {};
	console.error = () => {};
}

function restoreConsole(): void {
	console.warn = originalWarn;
	console.error = originalError;
}

// ==========================================
// Tests
// ==========================================

describe('MAX_FE_CONFIRM_RETRIES', () => {
	test('is a positive integer — the retry-cap comparison relies on it', () => {
		// Guard against accidental drift to 0/negative that would silently
		// disable FE retries while appearing "well-defined".
		expect(Number.isInteger(MAX_FE_CONFIRM_RETRIES)).toBe(true);
		expect(MAX_FE_CONFIRM_RETRIES).toBeGreaterThan(0);
	});
});

describe('reorg message constants', () => {
	test('reorg-safe + at-risk + no-session messages are non-empty and distinct', () => {
		// These strings hit the UI directly; an accidental dedupe/typo would
		// leak internal jargon to the user.
		expect(REORG_FUNDS_SAFE_MESSAGE.length).toBeGreaterThan(0);
		expect(REORG_FUNDS_AT_RISK_MESSAGE.length).toBeGreaterThan(0);
		expect(REORG_NO_SESSION_MESSAGE.length).toBeGreaterThan(0);
		expect(
			new Set([
				REORG_FUNDS_SAFE_MESSAGE,
				REORG_FUNDS_AT_RISK_MESSAGE,
				REORG_NO_SESSION_MESSAGE,
			]).size,
		).toBe(3);
	});
});

describe('handleConfirmationFailure', () => {
	beforeEach(() => {
		silenceConsole();
	});

	afterEach(() => {
		restoreConsole();
	});

	describe('terminal branch', () => {
		for (const code of TERMINAL_CONFIRM_ERRORS) {
			test(`routes ${code} to the failure step with the mapped message`, () => {
				const { target, rec } = buildHarness();

				handleConfirmationFailure(code, target);

				expect(rec.goToStepCalls).toEqual(['failure']);
				expect(rec.setErrorMessageCalls).toEqual([
					getPaymentErrorMessage(code),
				]);
				// Terminal branch returns before any timer/ref bump — double-check.
				expect(rec.confirmRetryTimerRef.current).toBeNull();
				expect(rec.confirmRetryAttemptsRef.current).toBe(0);
				expect(rec.setConfirmRetryTickCalls).toBe(0);
			});
		}
	});

	describe('deferred branch — convergence codes skip retry', () => {
		for (const code of DEFERRED_CONFIRM_ERRORS) {
			test(`defers ${code} to polling without scheduling a retry`, () => {
				const { target, rec } = buildHarness();

				handleConfirmationFailure(code, target);

				expect(rec.goToStepCalls.length).toBe(0);
				expect(rec.setErrorMessageCalls.length).toBe(0);
				expect(rec.confirmRetryTimerRef.current).toBeNull();
				expect(rec.confirmRetryAttemptsRef.current).toBe(0);
				expect(rec.setConfirmRetryTickCalls).toBe(0);
			});
		}
	});

	describe('retryable branch — below budget', () => {
		for (const startingAttempts of BELOW_BUDGET_ATTEMPTS) {
			test(`schedules a retry and bumps counter from ${startingAttempts} to ${startingAttempts + 1}`, () => {
				const { target, rec } = buildHarness(startingAttempts);

				handleConfirmationFailure(
					PAYMENT_ERROR_CODES.CRYPTO_CONFIRM_FAILED,
					target,
				);

				expect(rec.confirmRetryAttemptsRef.current).toBe(startingAttempts + 1);
				expect(rec.confirmRetryTimerRef.current).not.toBeNull();
				// No UI transition yet — polling/cron may still converge.
				expect(rec.goToStepCalls.length).toBe(0);
				expect(rec.setErrorMessageCalls.length).toBe(0);

				clearScheduledTimer(rec);
			});
		}
	});

	describe('retryable branch — at or beyond cap', () => {
		for (const startingAttempts of CAP_OR_BEYOND_ATTEMPTS) {
			test(`stops scheduling once attempts=${startingAttempts} (>= MAX)`, () => {
				const { target, rec } = buildHarness(startingAttempts);

				handleConfirmationFailure(
					PAYMENT_ERROR_CODES.CRYPTO_CONFIRM_FAILED,
					target,
				);

				// Counter is frozen — the caller never sees a bumped attempts
				// because the cap comparison is `>=`, not `>`.
				expect(rec.confirmRetryAttemptsRef.current).toBe(startingAttempts);
				expect(rec.confirmRetryTimerRef.current).toBeNull();
				expect(rec.goToStepCalls.length).toBe(0);
			});
		}
	});

	describe('boundary — cap transition (MAX - 1 vs MAX)', () => {
		test('attempts=MAX-1 still schedules, attempts=MAX stops', () => {
			// Documents the exact off-by-one: the helper uses `>= MAX_FE_CONFIRM_RETRIES`,
			// so MAX itself is the first rejected state.
			const below = buildHarness(MAX_FE_CONFIRM_RETRIES - 1);
			handleConfirmationFailure(
				PAYMENT_ERROR_CODES.CRYPTO_CONFIRM_FAILED,
				below.target,
			);
			expect(below.rec.confirmRetryTimerRef.current).not.toBeNull();
			clearScheduledTimer(below.rec);

			const atCap = buildHarness(MAX_FE_CONFIRM_RETRIES);
			handleConfirmationFailure(
				PAYMENT_ERROR_CODES.CRYPTO_CONFIRM_FAILED,
				atCap.target,
			);
			expect(atCap.rec.confirmRetryTimerRef.current).toBeNull();
		});
	});

	describe('scheduling precedence — terminal beats retry', () => {
		test('terminal error with attempts=0 still goes straight to failure', () => {
			// Precedence check: even with retry budget available, a terminal
			// error skips the retry path entirely.
			const { target, rec } = buildHarness(0);

			handleConfirmationFailure(
				PAYMENT_ERROR_CODES.CRYPTO_SESSION_EXPIRED,
				target,
			);

			expect(rec.goToStepCalls).toEqual(['failure']);
			expect(rec.confirmRetryTimerRef.current).toBeNull();
			expect(rec.confirmRetryAttemptsRef.current).toBe(0);
		});
	});
});
