import { describe, expect, test } from 'bun:test';
import {
	BaseError,
	TransactionNotFoundError,
	UserRejectedRequestError,
} from 'viem';

import {
	getWalletTransferErrorMessage,
	isWalletFeeCapTooLow,
	isTransactionNotFound,
	isUserRejection,
	isWalletRpcFetchFailure,
} from './errors';

describe('isUserRejection', () => {
	test('detects viem UserRejectedRequestError by name', () => {
		const error = new UserRejectedRequestError(new Error('denied'));
		expect(isUserRejection(error)).toBe(true);
	});

	test('detects wallet rejection by message pattern', () => {
		expect(isUserRejection(new Error('User rejected the request'))).toBe(true);
		expect(isUserRejection(new Error('user denied transaction'))).toBe(true);
		expect(isUserRejection(new Error('rejected the request'))).toBe(true);
	});

	test('detects EIP-1193 rejection by code 4001', () => {
		const error = Object.assign(new Error('rejected'), { code: 4001 });
		expect(isUserRejection(error)).toBe(true);
	});

	test('returns false for non-rejection errors', () => {
		expect(isUserRejection(new Error('insufficient funds'))).toBe(false);
		expect(isUserRejection('string error')).toBe(false);
		expect(isUserRejection(null)).toBe(false);
	});
});

describe('isTransactionNotFound', () => {
	test('returns true for a direct TransactionNotFoundError', () => {
		const error = new TransactionNotFoundError({ hash: '0xabc' });

		expect(isTransactionNotFound(error)).toBe(true);
	});

	test('returns true when TransactionNotFoundError is wrapped in BaseError cause chain', () => {
		const error = new BaseError('Outer wrapper', {
			cause: new TransactionNotFoundError({ hash: '0xabc' }),
		});

		expect(isTransactionNotFound(error)).toBe(true);
	});

	test('returns false for generic request noise', () => {
		const error = new BaseError('RPC request failed', {
			cause: new Error('503 upstream unavailable'),
		});

		expect(isTransactionNotFound(error)).toBe(false);
	});

	test('returns true for non-BaseError wrappers that preserve cause', () => {
		const error = new Error('Outer wrapper', {
			cause: new TransactionNotFoundError({ hash: '0xabc' }),
		});

		expect(isTransactionNotFound(error)).toBe(true);
	});
});

describe('isWalletRpcFetchFailure', () => {
	test('returns true for direct failed fetch message', () => {
		expect(isWalletRpcFetchFailure(new Error('Failed to fetch'))).toBe(true);
	});

	test('returns true when failed fetch is nested in a BaseError cause chain', () => {
		const error = new BaseError('ContractFunctionExecutionError', {
			cause: new Error('InternalRpcError: Failed to fetch'),
		});

		expect(isWalletRpcFetchFailure(error)).toBe(true);
	});

	test('returns true when failed fetch appears in serialized stack payload', () => {
		const error = {
			code: -32603,
			message: 'Internal error',
			stack: '{"code":-32603,"message":"Failed to fetch"}',
		};

		expect(isWalletRpcFetchFailure(error)).toBe(true);
	});

	test('returns false for non-transport failures', () => {
		expect(isWalletRpcFetchFailure(new Error('insufficient funds'))).toBe(
			false,
		);
		expect(isWalletRpcFetchFailure(null)).toBe(false);
	});

	test('walks non-BaseError wrappers that preserve cause', () => {
		// Some SDKs (wagmi, adapter middlewares) wrap viem errors in their
		// own Error subclasses without extending BaseError. The cause-walk
		// fallback catches transport failures hidden inside those wrappers.
		const error = new Error('Wrapped failure', {
			cause: new Error('Failed to fetch'),
		});

		expect(isWalletRpcFetchFailure(error)).toBe(true);
	});
});

describe('isWalletFeeCapTooLow', () => {
	test('returns true for direct FeeCapTooLowError by name', () => {
		const error = {
			name: 'FeeCapTooLowError',
			message:
				'The fee cap (`maxFeePerGas` gwei) cannot be lower than the block base fee.',
		};

		expect(isWalletFeeCapTooLow(error)).toBe(true);
	});

	test('returns true when fee-cap mismatch is nested in BaseError cause chain', () => {
		const error = new BaseError('ContractFunctionExecutionError', {
			cause: new Error(
				'max fee per gas less than block base fee: maxFeePerGas: 20020000 baseFee: 20082000',
			),
		});

		expect(isWalletFeeCapTooLow(error)).toBe(true);
	});

	test('returns false for unrelated transfer errors', () => {
		expect(
			isWalletFeeCapTooLow(
				new Error('execution reverted: transfer amount exceeds balance'),
			),
		).toBe(false);
		expect(isWalletFeeCapTooLow(null)).toBe(false);
	});

	test('walks non-BaseError wrappers that preserve cause', () => {
		// Mirror the isWalletRpcFetchFailure behaviour — wagmi and custom
		// adapter errors wrap fee-cap signals inside plain Error wrappers.
		const error = new Error('Wrapped failure', {
			cause: new Error(
				'max fee per gas less than block base fee: maxFeePerGas: 1 baseFee: 2',
			),
		});

		expect(isWalletFeeCapTooLow(error)).toBe(true);
	});
});

describe('getWalletTransferErrorMessage', () => {
	test('returns fee-cap guidance for maxFeePerGas lower than base fee', () => {
		const message = getWalletTransferErrorMessage({
			name: 'FeeCapTooLowError',
			message: 'fee cap lower than base fee',
		});

		expect(message).toBe(
			'Network fees changed while sending. Please retry the transaction so your wallet can refresh gas fees.',
		);
	});

	test('returns RPC guidance for failed fetch transport errors', () => {
		const message = getWalletTransferErrorMessage(new Error('Failed to fetch'));

		expect(message).toBe(
			'Wallet RPC request failed. Check your wallet network/RPC connection and try again.',
		);
	});

	test('returns generic fallback for non-transport wallet failures', () => {
		const message = getWalletTransferErrorMessage(
			new Error('execution reverted'),
		);

		expect(message).toBe('Transaction failed. Please try again.');
	});
});
