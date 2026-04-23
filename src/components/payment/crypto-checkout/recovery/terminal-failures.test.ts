import { describe, expect, mock, test } from 'bun:test';

import {
	failBackendTrackedReplacement,
	failConfirmingWindowExpired,
	failSubmittedTxRegistration,
	type TerminalSetters,
} from './terminal-failures';

// ==========================================
// Fixtures
// ==========================================

function buildSetters(): TerminalSetters {
	return {
		setSubmitRecoveryMode: mock(() => {}),
		setRetryBlocked: mock(() => {}),
		setFundsAtRisk: mock(() => {}),
		setErrorMessage: mock(() => {}),
		goToFailureStep: mock(() => {}),
	};
}

const BROADCAST_HASH =
	'0xabc1230000000000000000000000000000000000000000000000000000000001' as `0x${string}`;

// ==========================================
// failSubmittedTxRegistration
// ==========================================

describe('failSubmittedTxRegistration', () => {
	test('applies the funds-at-risk terminal state and jumps to failure step', () => {
		const setters = buildSetters();

		failSubmittedTxRegistration(setters)();

		expect(setters.setSubmitRecoveryMode).toHaveBeenCalledWith(null);
		expect(setters.setRetryBlocked).toHaveBeenCalledWith(true);
		expect(setters.setFundsAtRisk).toHaveBeenCalledWith(true);
		expect(setters.setErrorMessage).toHaveBeenCalledWith(
			'Transaction was sent, but the server could not safely register it. Please contact support with your transaction hash.',
		);
		expect(setters.goToFailureStep).toHaveBeenCalledTimes(1);
	});
});

// ==========================================
// failBackendTrackedReplacement
// ==========================================

describe('failBackendTrackedReplacement', () => {
	test('marks funds as safe when wallet cancelled the original tx', () => {
		const setters = buildSetters();

		failBackendTrackedReplacement(setters)('cancelled');

		expect(setters.setSubmitRecoveryMode).toHaveBeenCalledWith(null);
		expect(setters.setRetryBlocked).toHaveBeenCalledWith(true);
		expect(setters.setFundsAtRisk).toHaveBeenCalledWith(false);
		expect(setters.setErrorMessage).toHaveBeenCalledWith(
			'Your wallet cancelled the original transaction after the server had already registered it. Please wait for the checkout session to clear, then try again.',
		);
		expect(setters.goToFailureStep).toHaveBeenCalledTimes(1);
	});

	test('marks funds as at risk when the wallet replaced the original tx', () => {
		const setters = buildSetters();

		failBackendTrackedReplacement(setters)('replaced');

		expect(setters.setFundsAtRisk).toHaveBeenCalledWith(true);
		expect(setters.setErrorMessage).toHaveBeenCalledWith(
			'Your wallet replaced the original transaction after the server had already registered it. Please contact support with your transaction hash.',
		);
	});

	test('marks funds as at risk when the wallet repriced the original tx', () => {
		const setters = buildSetters();

		failBackendTrackedReplacement(setters)('repriced');

		expect(setters.setFundsAtRisk).toHaveBeenCalledWith(true);
	});

	test('treats null reason (no wagmi replacement signal) as ambiguous at-risk path', () => {
		const setters = buildSetters();

		failBackendTrackedReplacement(setters)(null);

		expect(setters.setFundsAtRisk).toHaveBeenCalledWith(true);
	});
});

// ==========================================
// failConfirmingWindowExpired
// ==========================================

describe('failConfirmingWindowExpired', () => {
	test('no-ops when success has already transitioned — prevents fake expiry', () => {
		const setters = buildSetters();

		failConfirmingWindowExpired(setters)({
			successAlreadyTransitioned: true,
			txSubmittedToBackend: false,
			txHash: undefined,
		});

		expect(setters.setErrorMessage).not.toHaveBeenCalled();
		expect(setters.goToFailureStep).not.toHaveBeenCalled();
	});

	test('shows the in-flight message when backend already owns the tx', () => {
		const setters = buildSetters();

		failConfirmingWindowExpired(setters)({
			successAlreadyTransitioned: false,
			txSubmittedToBackend: true,
			txHash: undefined,
		});

		expect(setters.setErrorMessage).toHaveBeenCalledWith(
			'Payment verification timed out. Your transaction may still be processing — please check your order history or contact support.',
		);
		expect(setters.goToFailureStep).toHaveBeenCalledTimes(1);
	});

	test('shows the in-flight message when a local tx hash exists even if backend has not accepted it', () => {
		const setters = buildSetters();

		failConfirmingWindowExpired(setters)({
			successAlreadyTransitioned: false,
			txSubmittedToBackend: false,
			txHash: BROADCAST_HASH,
		});

		expect(setters.setErrorMessage).toHaveBeenCalledWith(
			'Payment verification timed out. Your transaction may still be processing — please check your order history or contact support.',
		);
	});

	test('shows the plain session-expired message when no broadcast ever happened', () => {
		const setters = buildSetters();

		failConfirmingWindowExpired(setters)({
			successAlreadyTransitioned: false,
			txSubmittedToBackend: false,
			txHash: undefined,
		});

		expect(setters.setErrorMessage).toHaveBeenCalledWith(
			'Checkout session expired. Please try again.',
		);
		expect(setters.goToFailureStep).toHaveBeenCalledTimes(1);
	});
});
