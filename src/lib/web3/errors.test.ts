import { describe, expect, test } from 'bun:test';
import {
	BaseError,
	TransactionNotFoundError,
	UserRejectedRequestError,
} from 'viem';

import { isTransactionNotFound, isUserRejection } from './errors';

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
