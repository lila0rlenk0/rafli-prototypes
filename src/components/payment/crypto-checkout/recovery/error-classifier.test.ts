import { describe, expect, test } from 'bun:test';

import { classifyPayError } from './error-classifier';

// ==========================================
// Fixtures
// ==========================================

const BROADCAST_HASH =
	'0xabc1230000000000000000000000000000000000000000000000000000000001' as `0x${string}`;

/** Error that matches `isUserRejection` via `error.name` */
function buildUserRejectionError(): Error {
	const error = new Error('User rejected the request.');
	error.name = 'UserRejectedRequestError';
	return error;
}

/** Error that matches `isWalletFeeCapTooLow` via message signal (fee cap + base fee) */
function buildFeeCapTooLowError(): Error {
	const error = new Error(
		'max fee per gas less than block base fee: address 0x… fee cap too low',
	);
	error.name = 'FeeCapTooLowError';
	return error;
}

/** Generic wallet/RPC failure that falls through to the default wallet-error branch */
function buildGenericWalletError(): Error {
	return new Error('RPC request failed for unknown reason');
}

// ==========================================
// Tests
// ==========================================

describe('classifyPayError', () => {
	describe('post-broadcast errors', () => {
		test('returns broadcasted-needs-recovery when a tx hash was already broadcast', () => {
			const classification = classifyPayError(
				buildGenericWalletError(),
				BROADCAST_HASH,
			);

			expect(classification).toEqual({
				kind: 'broadcasted-needs-recovery',
				broadcastTxHash: BROADCAST_HASH,
			});
		});

		test('broadcast hash wins over user rejection signal — funds-at-risk invariant', () => {
			// Guard against the case where `sendTransactionAsync` resolved with a hash
			// but a downstream receipt path still surfaces a rejection-shaped error.
			// Dropping to review here would re-enable Pay and double-spend.
			const classification = classifyPayError(
				buildUserRejectionError(),
				BROADCAST_HASH,
			);

			expect(classification.kind).toBe('broadcasted-needs-recovery');
		});

		test('broadcast hash wins over fee-cap-too-low signal', () => {
			const classification = classifyPayError(
				buildFeeCapTooLowError(),
				BROADCAST_HASH,
			);

			expect(classification.kind).toBe('broadcasted-needs-recovery');
		});
	});

	describe('pre-broadcast wallet errors', () => {
		test('returns user-rejection when wallet was dismissed before broadcast', () => {
			const classification = classifyPayError(
				buildUserRejectionError(),
				undefined,
			);

			expect(classification).toEqual({ kind: 'user-rejection' });
		});

		test('returns fee-cap-too-low with a specific retry message on EIP-1559 mismatch', () => {
			const classification = classifyPayError(
				buildFeeCapTooLowError(),
				undefined,
			);

			expect(classification.kind).toBe('fee-cap-too-low');
			if (classification.kind === 'fee-cap-too-low') {
				expect(classification.message.length).toBeGreaterThan(0);
			}
		});

		test('returns wallet-error with a user-facing message for generic failures', () => {
			const classification = classifyPayError(
				buildGenericWalletError(),
				undefined,
			);

			expect(classification.kind).toBe('wallet-error');
			if (classification.kind === 'wallet-error') {
				expect(classification.message.length).toBeGreaterThan(0);
			}
		});

		test('treats non-Error throws as wallet-error', () => {
			const classification = classifyPayError('string error', undefined);

			expect(classification.kind).toBe('wallet-error');
		});
	});
});
