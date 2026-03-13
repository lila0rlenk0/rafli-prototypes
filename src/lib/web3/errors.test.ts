import { describe, expect, test } from 'bun:test';
import { BaseError, TransactionNotFoundError } from 'viem';

import { isTransactionNotFound } from './errors';

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
