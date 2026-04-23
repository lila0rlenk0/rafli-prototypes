import { describe, expect, test } from 'bun:test';
import { getAddress } from 'viem';

import { PAYMENT_ERROR_CODES, WALLET_ERROR_CODES } from '@/types/errors';
import type { RaffleCryptoToken } from '@/types/raffle';
import type { ServiceResponse } from '@/types/service-response';
import type {
	AtomicCryptoCheckoutResponse,
	CryptoCheckoutSession,
} from '@/types/wallet';

import {
	buildEipVerificationMessage,
	classifyWalletReadyAtomicOutcome,
	classifyWalletReadySigError,
	deriveAtomicCheckoutInput,
	handleWalletReadyEnsureVerified,
	isExistingSessionReusable,
} from './wallet-ready-guards';

// ==========================================
// Fixtures
// ==========================================

const WALLET_A = getAddress('0x1234567890AbCdEf1234567890aBcDeF12345678');
const WALLET_A_LOWER = getAddress('0x1234567890abcdef1234567890abcdef12345678');
const WALLET_B = getAddress('0xdEaDbEeF00000000000000000000000000000001');
const USER_ID = 'user-abc';
const TIMESTAMP = '2026-04-22T10:00:00.000Z';

const TOKEN_ADDRESS = getAddress('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');

const TOKEN: RaffleCryptoToken = {
	tokenId: 'usdc',
	symbol: 'USDC',
	price: null,
	address: TOKEN_ADDRESS,
	decimals: 6,
	isStablecoin: true,
};

/** Deadline well in the future — keeps the review guard on `ready` */
const FUTURE_DEADLINE = '2099-01-01T00:00:00.000Z';

function buildSession(
	overrides: Partial<CryptoCheckoutSession> = {},
): CryptoCheckoutSession {
	return {
		id: 'session-1',
		amount: '10',
		walletAddress: WALLET_A,
		amountRaw: '10000000',
		chainId: 8453,
		tokenAddress: TOKEN_ADDRESS,
		treasuryAddress: WALLET_A,
		orderId: 'order-1',
		expiresAt: FUTURE_DEADLINE,
		submitDeadline: FUTURE_DEADLINE,
		confirmDeadline: FUTURE_DEADLINE,
		confirmationTarget: 12,
		...overrides,
	};
}

// ==========================================
// Tests
// ==========================================

describe('buildEipVerificationMessage', () => {
	test('produces the exact EIP-191 format the backend reconstructs', () => {
		expect(
			buildEipVerificationMessage({
				address: WALLET_A,
				userId: USER_ID,
				timestamp: TIMESTAMP,
			}),
		).toBe(
			`Link wallet ${WALLET_A} to Raffles account ${USER_ID} at ${TIMESTAMP}`,
		);
	});

	test('preserves address casing — backend recovers signer from exact bytes', () => {
		// EIP-55 checksummed vs lowercase differ byte-for-byte; the helper must
		// not mutate the input casing.
		expect(
			buildEipVerificationMessage({
				address: WALLET_A_LOWER,
				userId: USER_ID,
				timestamp: TIMESTAMP,
			}),
		).toContain(WALLET_A_LOWER);
	});
});

describe('isExistingSessionReusable', () => {
	test('returns true when chain, token, wallet, and deadline all still match', () => {
		expect(
			isExistingSessionReusable({
				session: buildSession(),
				selectedChainId: 8453,
				sessionTokenId: TOKEN.tokenId,
				selectedToken: TOKEN,
				connectedAddress: WALLET_A,
				sessionWalletAddress: WALLET_A,
			}),
		).toBe(true);
	});

	test('returns false when no session exists', () => {
		expect(
			isExistingSessionReusable({
				session: null,
				selectedChainId: 8453,
				sessionTokenId: TOKEN.tokenId,
				selectedToken: TOKEN,
				connectedAddress: WALLET_A,
				sessionWalletAddress: WALLET_A,
			}),
		).toBe(false);
	});

	test('returns false when the selected chain no longer matches the session chain', () => {
		expect(
			isExistingSessionReusable({
				session: buildSession({ chainId: 8453 }),
				selectedChainId: 137,
				sessionTokenId: TOKEN.tokenId,
				selectedToken: TOKEN,
				connectedAddress: WALLET_A,
				sessionWalletAddress: WALLET_A,
			}),
		).toBe(false);
	});

	test('returns false when no token is selected', () => {
		expect(
			isExistingSessionReusable({
				session: buildSession(),
				selectedChainId: 8453,
				sessionTokenId: TOKEN.tokenId,
				selectedToken: null,
				connectedAddress: WALLET_A,
				sessionWalletAddress: WALLET_A,
			}),
		).toBe(false);
	});

	test('returns false when the selected token id differs from the session token id', () => {
		expect(
			isExistingSessionReusable({
				session: buildSession(),
				selectedChainId: 8453,
				sessionTokenId: 'usdt',
				selectedToken: TOKEN,
				connectedAddress: WALLET_A,
				sessionWalletAddress: WALLET_A,
			}),
		).toBe(false);
	});

	test('returns false when the connected wallet drifted from the session wallet', () => {
		expect(
			isExistingSessionReusable({
				session: buildSession(),
				selectedChainId: 8453,
				sessionTokenId: TOKEN.tokenId,
				selectedToken: TOKEN,
				connectedAddress: WALLET_B,
				sessionWalletAddress: WALLET_A,
			}),
		).toBe(false);
	});

	test('returns false when the submit window has already expired', () => {
		expect(
			isExistingSessionReusable({
				session: buildSession({ submitDeadline: '2000-01-01T00:00:00.000Z' }),
				selectedChainId: 8453,
				sessionTokenId: TOKEN.tokenId,
				selectedToken: TOKEN,
				connectedAddress: WALLET_A,
				sessionWalletAddress: WALLET_A,
			}),
		).toBe(false);
	});
});

describe('deriveAtomicCheckoutInput', () => {
	test('shapes the atomic checkout payload exactly as the backend schema expects', () => {
		const input = deriveAtomicCheckoutInput({
			raffleId: 'raffle-1',
			ticketQuantity: 5,
			promoCode: 'SPRING10',
			selectedChainId: 8453,
			walletAddress: WALLET_A,
			selectedToken: TOKEN,
		});

		expect(input).toEqual({
			raffleId: 'raffle-1',
			ticketQuantity: 5,
			promoCode: 'SPRING10',
			chainId: 8453,
			walletAddress: WALLET_A,
			token: TOKEN.tokenId,
		});
	});

	test('omits promoCode when not provided', () => {
		const input = deriveAtomicCheckoutInput({
			raffleId: 'raffle-1',
			ticketQuantity: 5,
			selectedChainId: 8453,
			walletAddress: WALLET_A,
			selectedToken: TOKEN,
		});

		expect(input.promoCode).toBeUndefined();
	});
});

// ==========================================
// classifyWalletReadySigError
// ==========================================

describe('classifyWalletReadySigError', () => {
	test('returns info + cancellation copy when the predicate flags a user rejection', () => {
		expect(
			classifyWalletReadySigError(new Error('rejected'), () => true),
		).toEqual({ tone: 'info', text: 'Signature cancelled.' });
	});

	test('returns error + generic retry copy for every other failure', () => {
		expect(
			classifyWalletReadySigError(new Error('network'), () => false),
		).toEqual({ tone: 'error', text: 'Signature failed. Please try again.' });
	});
});

// ==========================================
// classifyWalletReadyAtomicOutcome
// ==========================================

function buildFailure(): ServiceResponse<
	AtomicCryptoCheckoutResponse,
	(typeof PAYMENT_ERROR_CODES)[keyof typeof PAYMENT_ERROR_CODES]
> {
	return { success: false, error: PAYMENT_ERROR_CODES.CHECKOUT_FAILED };
}

function buildZeroTotalSuccess(): ServiceResponse<
	AtomicCryptoCheckoutResponse,
	(typeof PAYMENT_ERROR_CODES)[keyof typeof PAYMENT_ERROR_CODES]
> {
	return {
		success: true,
		data: {
			order: { id: 'order-1', status: 'completed', totalAmount: '0' },
			session: null,
			previousSessionCancelled: false,
		},
	};
}

function buildSessionSuccess(): ServiceResponse<
	AtomicCryptoCheckoutResponse,
	(typeof PAYMENT_ERROR_CODES)[keyof typeof PAYMENT_ERROR_CODES]
> {
	return {
		success: true,
		data: {
			order: { id: 'order-2', status: 'pending', totalAmount: '10' },
			session: buildSession(),
			previousSessionCancelled: false,
		},
	};
}

describe('classifyWalletReadyAtomicOutcome', () => {
	test('returns failed + precomputed clearPromo on a service error', () => {
		const outcome = classifyWalletReadyAtomicOutcome(
			buildFailure(),
			error => error === PAYMENT_ERROR_CODES.CHECKOUT_FAILED,
		);

		expect(outcome).toEqual({
			kind: 'failed',
			error: PAYMENT_ERROR_CODES.CHECKOUT_FAILED,
			clearPromo: true,
		});
	});

	test('returns zero-total when success lands without a session (promo auto-complete)', () => {
		const outcome = classifyWalletReadyAtomicOutcome(
			buildZeroTotalSuccess(),
			() => false,
		);

		expect(outcome.kind).toBe('zero-total');
	});

	test('returns session on the happy path with a hydrated crypto session', () => {
		const response = buildSessionSuccess();
		const outcome = classifyWalletReadyAtomicOutcome(response, () => false);

		if (!response.success || !response.data.session) {
			throw new Error('fixture invariant');
		}
		expect(outcome).toEqual({
			kind: 'session',
			session: response.data.session,
		});
	});
});

// ==========================================
// handleWalletReadyEnsureVerified
// ==========================================

describe('handleWalletReadyEnsureVerified', () => {
	/** Helper that always reports the flow as current — positive path fixture. */
	function flowAlwaysCurrent(): boolean {
		return true;
	}

	test('short-circuits to skip when the wallet is already verified', async () => {
		const outcome = await handleWalletReadyEnsureVerified({
			isWalletVerified: true,
			userId: USER_ID,
			checksummedAddress: WALLET_A,
			flowVersion: 1,
			isFlowCurrent: flowAlwaysCurrent,
			signMessage: async () => {
				throw new Error('signMessage must not be called');
			},
			verify: async () => {
				throw new Error('verify must not be called');
			},
			refetchWallets: async () => undefined,
		});

		expect(outcome).toEqual({ kind: 'skip' });
	});

	test('returns missing-user when the caller has no authenticated userId', async () => {
		const outcome = await handleWalletReadyEnsureVerified({
			isWalletVerified: false,
			userId: null,
			checksummedAddress: WALLET_A,
			flowVersion: 1,
			isFlowCurrent: flowAlwaysCurrent,
			signMessage: async () => '0x',
			verify: async () => ({ success: true, data: {} as never }),
			refetchWallets: async () => undefined,
		});

		expect(outcome).toEqual({ kind: 'missing-user' });
	});

	// First flow-check guard: runs immediately after `signMessage` resolves
	// and before the `verify` POST. A stale verdict here aborts the helper
	// without any server-side side-effect — the signed payload is simply
	// discarded in-browser.
	describe('post-signature flow-staleness', () => {
		test('returns flow-stale when the flow version invalidates after signing — verify must never run', async () => {
			let verifyCalled = false;
			const outcome = await handleWalletReadyEnsureVerified({
				isWalletVerified: false,
				userId: USER_ID,
				checksummedAddress: WALLET_A,
				flowVersion: 1,
				// only the first check runs; it reports stale and the helper bails
				// before verify. A second check would be a spec regression — the
				// helper must short-circuit, not keep walking the pipeline.
				isFlowCurrent: () => false,
				signMessage: async () => '0xsig',
				verify: async () => {
					verifyCalled = true;
					throw new Error('verify must not be called on stale flow');
				},
				refetchWallets: async () => undefined,
			});

			expect(outcome).toEqual({ kind: 'flow-stale' });
			expect(
				verifyCalled,
				'verify must not fire once the post-signature flow-check fails',
			).toBe(false);
		});
	});

	// Second flow-check guard: runs after `verify` succeeded and the wallets
	// list has been refetched. By the time we arrive here the backend has
	// ALREADY persisted the wallet link — the side-effect is irreversible.
	// The helper still returns `flow-stale` so the caller halts the rest of
	// the checkout pipeline (atomic checkout, hydration, broadcast) instead
	// of proceeding against a modal the user has since closed or replaced.
	describe('post-verify flow-staleness', () => {
		test('returns flow-stale when the flow invalidates after refetchWallets — verify already persisted server-side', async () => {
			let verifyCalled = false;
			let refetchCalled = false;
			// Only flip on the SECOND call: the first (post-signature) must pass
			// so the pipeline reaches `verify` + `refetchWallets`; the second
			// (post-refetch) reports stale, proving the helper re-checks even
			// after the server-side write landed.
			let flowCheckCount = 0;
			function isFlowCurrent(): boolean {
				flowCheckCount += 1;
				return flowCheckCount === 1;
			}

			const outcome = await handleWalletReadyEnsureVerified({
				isWalletVerified: false,
				userId: USER_ID,
				checksummedAddress: WALLET_A,
				flowVersion: 1,
				isFlowCurrent,
				signMessage: async () => '0xsig',
				verify: async () => {
					verifyCalled = true;
					return { success: true, data: {} as never };
				},
				refetchWallets: async () => {
					refetchCalled = true;
				},
			});

			expect(outcome).toEqual({ kind: 'flow-stale' });
			expect(
				verifyCalled,
				'verify must fire before the post-verify check — that is the whole point of the gap',
			).toBe(true);
			expect(
				refetchCalled,
				'refetchWallets must fire before the post-verify check — the staleness is observed AFTER the cache sync',
			).toBe(true);
			expect(
				flowCheckCount,
				'both flow-version checks must execute — first passes, second fails',
			).toBe(2);
		});
	});

	test('returns verify-failed with the backend error code on rejection', async () => {
		const outcome = await handleWalletReadyEnsureVerified({
			isWalletVerified: false,
			userId: USER_ID,
			checksummedAddress: WALLET_A,
			flowVersion: 1,
			isFlowCurrent: flowAlwaysCurrent,
			signMessage: async () => '0xsig',
			verify: async () => ({
				success: false,
				error: WALLET_ERROR_CODES.SIGNATURE_INVALID,
			}),
			refetchWallets: async () => undefined,
		});

		expect(outcome).toEqual({
			kind: 'verify-failed',
			error: WALLET_ERROR_CODES.SIGNATURE_INVALID,
		});
	});

	test('returns verified after a successful signature + verify + refetch roundtrip', async () => {
		let refetched = false;
		const outcome = await handleWalletReadyEnsureVerified({
			isWalletVerified: false,
			userId: USER_ID,
			checksummedAddress: WALLET_A,
			flowVersion: 1,
			isFlowCurrent: flowAlwaysCurrent,
			signMessage: async ({ message }) => {
				// Confirm the helper passes through the EIP-191 plaintext. The
				// timestamp portion is generated inside the helper, so we match
				// the fixed prefix and leave the timestamp to a regex sanity check.
				expect(message).toStartWith(
					`Link wallet ${WALLET_A} to Raffles account ${USER_ID} at `,
				);
				expect(message).toMatch(/\dT\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
				return '0xsig';
			},
			verify: async payload => {
				expect(payload.address).toBe(WALLET_A);
				expect(payload.signature).toBe('0xsig');
				return { success: true, data: {} as never };
			},
			refetchWallets: async () => {
				refetched = true;
			},
		});

		expect(outcome).toEqual({ kind: 'verified' });
		expect(refetched).toBe(true);
	});
});
