import { describe, expect, test } from 'bun:test';
import { type Address } from 'viem';

import { mapPolledCryptoFailureReasonToUserMessage } from '@/lib/checkout/error-messages';
import type { RaffleCryptoToken } from '@/types/raffle';
import type { CryptoCheckoutSession } from '@/types/wallet';

import {
	runApplyServerHydration,
	type ServerSessionSnapshot,
	type UseCheckoutSessionDeps,
} from './use-checkout-session';

/** Matches `FALLBACK_FAILURE_MESSAGE` in use-checkout-session.ts — hydration must not echo raw `failureReason` */
const FALLBACK = 'Payment verification failed. Please try again.';

const ADDR: Address = '0x0000000000000000000000000000000000000001';
const STABLE_DEADLINE = '2025-01-01T00:00:00.000Z';

function minCheckoutSession(
	overrides: Partial<CryptoCheckoutSession> = {},
): CryptoCheckoutSession {
	return {
		id: 'sess_1',
		amount: '1',
		walletAddress: ADDR,
		amountRaw: '0',
		chainId: 1,
		tokenAddress: ADDR,
		treasuryAddress: ADDR,
		orderId: 'ord_1',
		expiresAt: STABLE_DEADLINE,
		submitDeadline: STABLE_DEADLINE,
		confirmDeadline: STABLE_DEADLINE,
		confirmationTarget: 1,
		...overrides,
	};
}

const minToken: RaffleCryptoToken = {
	tokenId: 'tok_1',
	symbol: 'USDC',
	price: null,
	address: ADDR,
	decimals: 6,
	isStablecoin: true,
};

function minServer(
	overrides: Partial<ServerSessionSnapshot> = {},
): ServerSessionSnapshot {
	return {
		currency: 'USDC',
		txHash: null,
		submitDeadline: STABLE_DEADLINE,
		confirmDeadline: STABLE_DEADLINE,
		...overrides,
	};
}

describe('runApplyServerHydration (failure path)', () => {
	test('maps failureReason through mapPolledCryptoFailureReasonToUserMessage, not raw echo', () => {
		const internalDiagnostic =
			'DB constraint violation: payments.crypto_sessions.tx_hash_reused';
		let appliedError: string | null | undefined;

		const result = runApplyServerHydration(
			{
				serverSession: minServer({ failureReason: internalDiagnostic }),
				checkoutSession: minCheckoutSession(),
				checksummedAddress: ADDR,
				fallbackToken: minToken,
				nextStep: 'failure',
			},
			{
				applySessionState: () => {
					/* no-op for this assertion */
				},
				buildRecoveredToken: () => minToken,
				depsRef: {
					current: {
						cryptoOptions: { chains: [] },
						ticketQuantity: 1,
						applyRuntimeState: p => {
							appliedError = p.errorMessage;
						},
						goToStep: () => {
							/* */
						},
						transitionToSuccess: () => {
							/* */
						},
						isPreConfirmingFlowCurrent: () => true,
						releasePayInFlight: () => {
							/* */
						},
						setIsProcessing: () => {
							/* */
						},
					} satisfies UseCheckoutSessionDeps,
				},
			},
		);

		expect(result).toBe('failure');
		// Before fix: `appliedError` was the raw internal string. After: generic fallback
		// (same as terminal-sync for unknown / non-code strings).
		const expected = mapPolledCryptoFailureReasonToUserMessage(
			internalDiagnostic,
			FALLBACK,
		);
		expect(appliedError).toBe(expected);
		expect(appliedError).toBe(FALLBACK);
		expect(appliedError).not.toBe(internalDiagnostic);
	});

	test('known payment error code maps to user-facing copy (parity with terminal sync)', () => {
		const code = 'payments:crypto:tx-already-used' as const;
		let appliedError: string | null | undefined;

		runApplyServerHydration(
			{
				serverSession: minServer({ failureReason: code }),
				checkoutSession: minCheckoutSession(),
				checksummedAddress: ADDR,
				fallbackToken: minToken,
				nextStep: 'failure',
			},
			{
				applySessionState: () => {
					/* */
				},
				buildRecoveredToken: () => minToken,
				depsRef: {
					current: {
						cryptoOptions: { chains: [] },
						ticketQuantity: 1,
						applyRuntimeState: p => {
							appliedError = p.errorMessage;
						},
						goToStep: () => {
							/* */
						},
						transitionToSuccess: () => {
							/* */
						},
						isPreConfirmingFlowCurrent: () => true,
						releasePayInFlight: () => {
							/* */
						},
						setIsProcessing: () => {
							/* */
						},
					} satisfies UseCheckoutSessionDeps,
				},
			},
		);

		const expected = mapPolledCryptoFailureReasonToUserMessage(code, FALLBACK);
		expect(appliedError).toBe(expected);
		expect(appliedError).toContain('already used');
	});
});
