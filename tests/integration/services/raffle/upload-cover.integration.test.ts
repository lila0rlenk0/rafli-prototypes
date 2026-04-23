import { describe, expect, mock, test } from 'bun:test';

import { CLIENT_ERROR_CODES } from '@/types/errors/client-errors';
import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import { RAFFLE_ERROR_CODES } from '@/types/errors/raffle-errors';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

// --- Fixtures ---

const VALID_COVER_RESPONSE = {
	coverMediaUrl: 'https://cdn.example.com/covers/raffle-1.jpg',
};

// --- Helpers ---

/** Creates a minimal File-like object for testing */
function createTestFile(
	name: string,
	type: string,
	sizeBytes: number,
): File {
	// Create a buffer of the desired size
	const buffer = new ArrayBuffer(sizeBytes);
	return new File([buffer], name, { type });
}

// --- Mocks ---

const mockPost = mock();

mock.module('@/lib/api/client', () => ({
	baseClient: { get: mock(), post: mock() },
	authenticatedClient: { get: mock(), post: mockPost },
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mock(),
}));
// All session exports required — incomplete mocks contaminate other test files via Bun's global mock.module()
mock.module('@/lib/auth/session', () => ({
	getSession: mock(() => ({ user: { id: 'user-1' } })),
	setAuthCookies: mock(),
	getAuthToken: mock(),
	getCurrentUser: mock(),
	requireAuth: mock(),
	requireEmailVerification: mock(),
}));
mock.module('@/lib/analytics/mixpanel-server', () => ({
	trackServer: mock(),
}));

// Import AFTER mocking
const { uploadCover } = await import('@/services/raffle/upload-cover');

describe('uploadCover', () => {
	describe('success', () => {
		test('returns cover URL on valid upload', async () => {
			mockPost.mockResolvedValueOnce(
				mockAxiosResponse(VALID_COVER_RESPONSE),
			);

			const file = createTestFile('cover.jpg', 'image/jpeg', 1_024);
			const result = await uploadCover('raffle-1', file);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.coverMediaUrl).toBe(
					'https://cdn.example.com/covers/raffle-1.jpg',
				);
			}
		});
	});

	describe('client-side validation', () => {
		test('returns UPLOAD_INVALID_TYPE for unsupported file type', async () => {
			const file = createTestFile('doc.pdf', 'application/pdf', 1_024);
			const result = await uploadCover('raffle-1', file);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(CLIENT_ERROR_CODES.UPLOAD_INVALID_TYPE);
			}
		});

		test('returns UPLOAD_TOO_LARGE for oversized file', async () => {
			// 6MB — exceeds 5MB limit
			const file = createTestFile('big.jpg', 'image/jpeg', 6 * 1024 * 1024);
			const result = await uploadCover('raffle-1', file);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(CLIENT_ERROR_CODES.UPLOAD_TOO_LARGE);
			}
		});

		test('accepts image/png file type', async () => {
			mockPost.mockResolvedValueOnce(
				mockAxiosResponse(VALID_COVER_RESPONSE),
			);

			const file = createTestFile('cover.png', 'image/png', 1_024);
			const result = await uploadCover('raffle-1', file);

			expect(result.success).toBe(true);
		});

		test('accepts image/webp file type', async () => {
			mockPost.mockResolvedValueOnce(
				mockAxiosResponse(VALID_COVER_RESPONSE),
			);

			const file = createTestFile('cover.webp', 'image/webp', 1_024);
			const result = await uploadCover('raffle-1', file);

			expect(result.success).toBe(true);
		});
	});

	describe('zod validation failure', () => {
		test('returns FETCH_FAILED on invalid response shape', async () => {
			mockPost.mockResolvedValueOnce(
				mockAxiosResponse({ invalid: true }),
			);

			const file = createTestFile('cover.jpg', 'image/jpeg', 1_024);
			const result = await uploadCover('raffle-1', file);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(RAFFLE_ERROR_CODES.FETCH_FAILED);
			}
		});
	});

	describe('network errors', () => {
		test('maps ERR_NETWORK to network_error', async () => {
			mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

			const file = createTestFile('cover.jpg', 'image/jpeg', 1_024);
			const result = await uploadCover('raffle-1', file);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
			}
		});

		test('maps ECONNABORTED to timeout_error', async () => {
			mockPost.mockRejectedValueOnce(
				mockAxiosError({ code: 'ECONNABORTED' }),
			);

			const file = createTestFile('cover.jpg', 'image/jpeg', 1_024);
			const result = await uploadCover('raffle-1', file);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.TIMEOUT_ERROR);
			}
		});
	});

	describe('HTTP status fallbacks', () => {
		test('maps 401 to unauthorized', async () => {
			mockPost.mockRejectedValueOnce(mockAxiosError({ status: 401 }));

			const file = createTestFile('cover.jpg', 'image/jpeg', 1_024);
			const result = await uploadCover('raffle-1', file);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.UNAUTHORIZED);
			}
		});

		test('maps 500 to internal_server_error', async () => {
			mockPost.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

			const file = createTestFile('cover.jpg', 'image/jpeg', 1_024);
			const result = await uploadCover('raffle-1', file);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
			}
		});
	});
});
