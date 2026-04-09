import { describe, expect, test } from 'bun:test';

import { failure, handleServiceError, success } from './error-handler';

describe('success', () => {
	test('creates success response with data', () => {
		const result = success({ id: '123', name: 'Test' });
		expect(result).toEqual({
			success: true,
			data: { id: '123', name: 'Test' },
		});
	});

	test('creates success response with undefined for void ops', () => {
		const result = success(undefined);
		expect(result).toEqual({ success: true, data: undefined });
	});

	test('creates success response with string data', () => {
		const result = success('token-abc');
		expect(result).toEqual({ success: true, data: 'token-abc' });
	});

	test('creates success response with array data', () => {
		const result = success([1, 2, 3]);
		expect(result).toEqual({ success: true, data: [1, 2, 3] });
	});

	test('creates success response with null data', () => {
		const result = success(null);
		expect(result).toEqual({ success: true, data: null });
	});
});

describe('failure', () => {
	test('creates failure response with error code', () => {
		const result = failure('unauthorized');
		expect(result).toEqual({ success: false, error: 'unauthorized' });
	});

	test('creates failure response with domain error code', () => {
		const result = failure('auth:user:invalid-credentials');
		expect(result).toEqual({
			success: false,
			error: 'auth:user:invalid-credentials',
		});
	});
});

describe('handleServiceError', () => {
	describe('success path', () => {
		test('returns success when fn resolves', async () => {
			const result = await handleServiceError(
				async () => ({ id: '1' }),
				() => 'unknown_error',
			);
			expect(result).toEqual({ success: true, data: { id: '1' } });
		});

		test('returns success with undefined for void operations', async () => {
			const result = await handleServiceError(
				async () => undefined,
				() => 'unknown_error',
			);
			expect(result).toEqual({ success: true, data: undefined });
		});
	});

	describe('error path', () => {
		test('returns failure with mapped error when fn throws', async () => {
			const result = await handleServiceError(
				async () => {
					throw new Error('Network failure');
				},
				() => 'network_error',
			);
			expect(result).toEqual({ success: false, error: 'network_error' });
		});

		test('passes caught error to mapError function', async () => {
			const thrownError = new Error('test error');
			let receivedError: unknown;

			await handleServiceError(
				async () => {
					throw thrownError;
				},
				error => {
					receivedError = error;
					return 'mapped_error';
				},
			);

			expect(receivedError).toBe(thrownError);
		});

		test('handles non-Error throws', async () => {
			const result = await handleServiceError(
				async () => {
					throw 'string error';
				},
				() => 'unknown_error',
			);
			expect(result).toEqual({ success: false, error: 'unknown_error' });
		});
	});

	describe('discriminated union narrowing', () => {
		test('success branch has data, no error', async () => {
			const result = await handleServiceError(
				async () => 42,
				() => 'fail',
			);
			if (result.success) {
				expect(result.data).toBe(42);
			} else {
				// Should not reach here
				expect(true).toBe(false);
			}
		});

		test('failure branch has error, no data', async () => {
			const result = await handleServiceError(
				async () => {
					throw new Error();
				},
				() => 'some_error',
			);
			if (!result.success) {
				expect(result.error).toBe('some_error');
			} else {
				// Should not reach here
				expect(true).toBe(false);
			}
		});
	});
});
