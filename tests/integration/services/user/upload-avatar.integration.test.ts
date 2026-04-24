import { describe, expect, mock, test } from 'bun:test';

import { CLIENT_ERROR_CODES } from '@/types/errors/client-errors';
import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

// --- Fixtures ---

const VALID_AVATAR_RESPONSE = {
	image: 'users/user-1/avatar.jpg',
};

// --- Helpers ---

/** Creates a minimal File-like object for testing */
function createTestFile(
	name: string,
	type: string,
	sizeBytes: number,
): File {
	const buffer = new ArrayBuffer(sizeBytes);
	return new File([buffer], name, { type });
}

// --- Mocks ---

const mockPost = mock();
const mockRunAfter = mock();

mock.module('@/lib/api/client', () => ({
	baseClient: { get: mock(), post: mock() },
	authenticatedClient: { get: mock(), post: mockPost },
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mock(),
}));
// `revalidateProfile` hits next/cache under the hood — mock `runAfter` so the
// deferred task never runs in the test runner (no request scope).
mock.module('@/lib/utils/run-after', () => ({
	runAfter: mockRunAfter,
}));

// Import AFTER mocking
const { uploadAvatar } = await import('@/services/user/upload-avatar');

describe('uploadAvatar', () => {
	describe('success', () => {
		test('returns success undefined on valid upload', async () => {
			mockRunAfter.mockClear();
			mockPost.mockResolvedValueOnce(
				mockAxiosResponse(VALID_AVATAR_RESPONSE),
			);

			const file = createTestFile('avatar.jpg', 'image/jpeg', 1_024);
			const result = await uploadAvatar(file);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toBeUndefined();
			}
			// Revalidation is deferred via runAfter so callers don't pay for the cache purge.
			expect(mockRunAfter).toHaveBeenCalledTimes(1);
		});
	});

	describe('client-side validation', () => {
		test('returns UPLOAD_INVALID_TYPE for unsupported file type', async () => {
			const file = createTestFile('doc.pdf', 'application/pdf', 1_024);
			const result = await uploadAvatar(file);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(CLIENT_ERROR_CODES.UPLOAD_INVALID_TYPE);
			}
		});

		test('returns UPLOAD_TOO_LARGE for oversized file', async () => {
			// 6MB — exceeds 5MB limit
			const file = createTestFile(
				'big.jpg',
				'image/jpeg',
				6 * 1024 * 1024,
			);
			const result = await uploadAvatar(file);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(CLIENT_ERROR_CODES.UPLOAD_TOO_LARGE);
			}
		});

		test('accepts image/png file type', async () => {
			mockPost.mockResolvedValueOnce(
				mockAxiosResponse(VALID_AVATAR_RESPONSE),
			);

			const file = createTestFile('avatar.png', 'image/png', 1_024);
			const result = await uploadAvatar(file);

			expect(result.success).toBe(true);
		});

		test('accepts image/webp file type', async () => {
			mockPost.mockResolvedValueOnce(
				mockAxiosResponse(VALID_AVATAR_RESPONSE),
			);

			const file = createTestFile('avatar.webp', 'image/webp', 1_024);
			const result = await uploadAvatar(file);

			expect(result.success).toBe(true);
		});
	});

	describe('zod validation failure', () => {
		test('returns VALIDATION_ERROR on invalid response shape', async () => {
			mockPost.mockResolvedValueOnce(
				mockAxiosResponse({ invalid: true }),
			);

			const file = createTestFile('avatar.jpg', 'image/jpeg', 1_024);
			const result = await uploadAvatar(file);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.VALIDATION_ERROR);
			}
		});
	});

	describe('network errors', () => {
		test('maps ERR_NETWORK to network_error', async () => {
			mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

			const file = createTestFile('avatar.jpg', 'image/jpeg', 1_024);
			const result = await uploadAvatar(file);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
			}
		});

		test('maps ECONNABORTED to timeout_error', async () => {
			mockPost.mockRejectedValueOnce(
				mockAxiosError({ code: 'ECONNABORTED' }),
			);

			const file = createTestFile('avatar.jpg', 'image/jpeg', 1_024);
			const result = await uploadAvatar(file);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.TIMEOUT_ERROR);
			}
		});
	});

	describe('HTTP status fallbacks', () => {
		test('maps 401 to unauthorized', async () => {
			mockPost.mockRejectedValueOnce(mockAxiosError({ status: 401 }));

			const file = createTestFile('avatar.jpg', 'image/jpeg', 1_024);
			const result = await uploadAvatar(file);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.UNAUTHORIZED);
			}
		});

		test('maps 500 to internal_server_error', async () => {
			mockPost.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

			const file = createTestFile('avatar.jpg', 'image/jpeg', 1_024);
			const result = await uploadAvatar(file);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
			}
		});
	});
});
