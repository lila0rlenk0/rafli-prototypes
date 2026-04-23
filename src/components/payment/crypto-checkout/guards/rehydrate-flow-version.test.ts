import { describe, expect, test } from 'bun:test';
import { getAddress } from 'viem';

import type { RevalidatedServerSession } from '@/components/payment/crypto-checkout/session/pay-session-revalidate';
import type { ApplyServerHydrationParams } from '@/components/payment/crypto-checkout/session/use-checkout-session';
import { CRYPTO_PAYMENT_STATUS } from '@/types/payment';
import type { RaffleCryptoToken } from '@/types/raffle';
import type { CryptoCheckoutSession } from '@/types/wallet';

import { runPayRehydrateBranch } from './rehydrate-guard';

// ==========================================
// Fixtures
// ==========================================

const WALLET = getAddress('0x1234567890AbCdEf1234567890aBcDeF12345678');

const SESSION: CryptoCheckoutSession = {
	id: 'session_rehydrate',
	amount: '10',
	walletAddress: WALLET,
	amountRaw: '10000000',
	chainId: 8_453,
	tokenAddress: WALLET,
	treasuryAddress: WALLET,
	orderId: 'order_rehydrate',
	expiresAt: '2099-01-01T00:00:00.000Z',
	submitDeadline: '2099-01-01T00:00:00.000Z',
	confirmDeadline: '2099-01-01T00:01:00.000Z',
	confirmationTarget: 12,
};

const REFRESHED_SESSION: RevalidatedServerSession = {
	status: CRYPTO_PAYMENT_STATUS.CONFIRMING,
	submitDeadline: '2099-01-01T00:00:00.000Z',
	confirmDeadline: '2099-01-01T00:01:00.000Z',
	txHash: null,
	currency: 'USDC',
	failureReason: null,
};

const FALLBACK_TOKEN: RaffleCryptoToken = {
	tokenId: 'usdc',
	symbol: 'USDC',
	price: null,
	address: WALLET,
	decimals: 6,
	isStablecoin: true,
};

// ==========================================
// Harness
// ==========================================

interface Harness {
	hydrateCalls: ApplyServerHydrationParams[];
	releaseCount: number;
	processingCalls: boolean[];
}

function buildHarness(): Harness {
	return { hydrateCalls: [], releaseCount: 0, processingCalls: [] };
}

// ==========================================
// Tests
// ==========================================

describe('runPayRehydrateBranch — flow-version re-check after revalidate', () => {
	test('skips applyServerHydration when flow version drifted mid-await', () => {
		// CONTRACT: between `await revalidateSessionBeforePay(...)` and this
		// branch firing, a parallel `handleClose` can bump the pre-confirming
		// flow version. Writing hydrated state into a modal the user
		// already dismissed fires setters on an unmounted tree AND
		// re-arms the review step for a session the user abandoned.
		const h = buildHarness();

		const outcome = runPayRehydrateBranch({
			capturedFlowVersion: 3,
			getCurrentFlowVersion: () => 4,
			refreshedSession: REFRESHED_SESSION,
			sessionData: SESSION,
			checksummedAddress: WALLET,
			fallbackToken: FALLBACK_TOKEN,
			nextStep: 'confirming',
			applyServerHydration: par => {
				h.hydrateCalls.push(par);
			},
			releasePayInFlight: () => {
				h.releaseCount += 1;
			},
			setIsProcessing: v => {
				h.processingCalls.push(v);
			},
		});

		// Hydrate MUST NOT fire — flow version mismatch.
		expect(h.hydrateCalls.length).toBe(0);
		expect(outcome).toBe('skipped');

		// Cleanup still runs — pay attempt is done either way.
		expect(h.releaseCount).toBe(1);
		expect(h.processingCalls).toEqual([false]);
	});

	test('applies hydration when flow version still current', () => {
		// Negative baseline — no drift, so the rehydrate branch must
		// invoke `applyServerHydration` with the refreshed snapshot.
		const h = buildHarness();

		const outcome = runPayRehydrateBranch({
			capturedFlowVersion: 7,
			getCurrentFlowVersion: () => 7,
			refreshedSession: REFRESHED_SESSION,
			sessionData: SESSION,
			checksummedAddress: WALLET,
			fallbackToken: FALLBACK_TOKEN,
			nextStep: 'confirming',
			applyServerHydration: par => {
				h.hydrateCalls.push(par);
			},
			releasePayInFlight: () => {
				h.releaseCount += 1;
			},
			setIsProcessing: v => {
				h.processingCalls.push(v);
			},
		});

		expect(h.hydrateCalls.length).toBe(1);
		expect(outcome).toBe('applied');
		expect(h.hydrateCalls[0]).toEqual({
			serverSession: REFRESHED_SESSION,
			checkoutSession: SESSION,
			checksummedAddress: WALLET,
			fallbackToken: FALLBACK_TOKEN,
			nextStep: 'confirming',
		});
		expect(h.releaseCount).toBe(1);
		expect(h.processingCalls).toEqual([false]);
	});
});
