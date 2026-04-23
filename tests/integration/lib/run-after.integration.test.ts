import { describe, expect, mock, test } from 'bun:test';

// next/server's `after` throws synchronously when called outside a Next.js
// request scope. Our runAfter() detects that specific error by message match
// and falls back to immediate execution, so integration tests can run server
// actions that schedule side effects without crashing.

const mockAfter = mock();

mock.module('next/server', () => ({
	after: mockAfter,
}));

const { runAfter } = await import('@/lib/utils/run-after');

function resetAllMocks(): void {
	mockAfter.mockReset();
}

describe('runAfter', () => {
	describe('inside request scope', () => {
		test('delegates to next/server after()', () => {
			resetAllMocks();
			const task = mock();

			runAfter(task);

			expect(mockAfter).toHaveBeenCalledTimes(1);
			expect(mockAfter).toHaveBeenCalledWith(task);
			// after() owns execution — runAfter must not invoke task directly
			expect(task).not.toHaveBeenCalled();
		});
	});

	describe('outside request scope', () => {
		test('falls back to immediate fire-and-forget when after() throws the scope error', () => {
			resetAllMocks();
			mockAfter.mockImplementationOnce(() => {
				throw new Error('`after` was called outside a request scope');
			});
			const task = mock();

			runAfter(task);

			// Fallback: call the task directly so scheduled side effects still run
			expect(task).toHaveBeenCalledTimes(1);
		});

		test('tolerates an async task rejecting (fire-and-forget via void)', async () => {
			resetAllMocks();
			mockAfter.mockImplementationOnce(() => {
				throw new Error('`after` was called outside a request scope');
			});
			// Rejected task — runAfter uses `void` so rejection is swallowed,
			// not propagated up as an unhandled rejection that would fail the test
			const task = mock(() => Promise.reject(new Error('task failed')));

			expect(() => runAfter(task)).not.toThrow();
			expect(task).toHaveBeenCalledTimes(1);

			// Drain the microtask queue so the rejected promise settles before
			// the test exits, preventing it from surfacing as unhandled noise
			await Promise.resolve();
		});
	});

	describe('unrelated errors', () => {
		test('rethrows errors that are not the outside-scope marker', () => {
			resetAllMocks();
			const unexpected = new Error('something totally different');
			mockAfter.mockImplementationOnce(() => {
				throw unexpected;
			});
			const task = mock();

			expect(() => runAfter(task)).toThrow(unexpected);
			// Task must not run when we rethrow — caller gets to decide recovery
			expect(task).not.toHaveBeenCalled();
		});

		test('rethrows non-Error throws unchanged', () => {
			resetAllMocks();
			mockAfter.mockImplementationOnce(() => {
				throw 'string-thrown-value';
			});
			const task = mock();

			expect(() => runAfter(task)).toThrow('string-thrown-value');
			expect(task).not.toHaveBeenCalled();
		});
	});
});
