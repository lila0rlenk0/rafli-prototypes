import { describe, expect, mock, test } from 'bun:test';

import { CLIENT_ERROR_CODES } from '@/types/errors/client-errors';
import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';
import { RAFFLE_ERROR_CODES } from '@/types/errors/raffle-errors';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

// --- Fixtures ---

const VALID_GALLERY_RESPONSE = {
	galleryMediaUrls: [
		'https://cdn.example.com/gallery/img1.jpg',
		'https://cdn.example.com/gallery/img2.jpg',
	],
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
const { uploadGalleryImages } = await import(
	'@/services/raffle/upload-gallery'
);

describe('uploadGalleryImages', () => {
	describe('success', () => {
		test('returns gallery URLs on valid upload', async () => {
			mockPost.mockResolvedValueOnce(
				mockAxiosResponse(VALID_GALLERY_RESPONSE),
			);

			const files = [
				createTestFile('img1.jpg', 'image/jpeg', 1_024),
				createTestFile('img2.png', 'image/png', 2_048),
			];
			const result = await uploadGalleryImages('raffle-1', files);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.galleryMediaUrls).toHaveLength(2);
			}
		});
	});

	describe('client-side validation', () => {
		test('returns UPLOAD_INVALID_TYPE for empty files array', async () => {
			const result = await uploadGalleryImages('raffle-1', []);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(CLIENT_ERROR_CODES.UPLOAD_INVALID_TYPE);
			}
		});

		test('returns UPLOAD_TOO_MANY_FILES when exceeding max images', async () => {
			// 11 files — exceeds MAX_IMAGES of 10
			const files = Array.from({ length: 11 }, (_, i) =>
				createTestFile(`img${i}.jpg`, 'image/jpeg', 1_024),
			);
			const result = await uploadGalleryImages('raffle-1', files);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(CLIENT_ERROR_CODES.UPLOAD_TOO_MANY_FILES);
			}
		});

		test('returns UPLOAD_INVALID_TYPE for unsupported file type in batch', async () => {
			const files = [
				createTestFile('img.jpg', 'image/jpeg', 1_024),
				createTestFile('doc.pdf', 'application/pdf', 1_024),
			];
			const result = await uploadGalleryImages('raffle-1', files);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(CLIENT_ERROR_CODES.UPLOAD_INVALID_TYPE);
			}
		});

		test('returns UPLOAD_TOO_LARGE for oversized file in batch', async () => {
			const files = [
				createTestFile('img.jpg', 'image/jpeg', 1_024),
				// 6MB — exceeds 5MB limit
				createTestFile('big.jpg', 'image/jpeg', 6 * 1024 * 1024),
			];
			const result = await uploadGalleryImages('raffle-1', files);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(CLIENT_ERROR_CODES.UPLOAD_TOO_LARGE);
			}
		});
	});

	describe('zod validation failure', () => {
		test('returns FETCH_FAILED on invalid response shape', async () => {
			mockPost.mockResolvedValueOnce(
				mockAxiosResponse({ invalid: true }),
			);

			const files = [createTestFile('img.jpg', 'image/jpeg', 1_024)];
			const result = await uploadGalleryImages('raffle-1', files);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(RAFFLE_ERROR_CODES.FETCH_FAILED);
			}
		});
	});

	describe('network errors', () => {
		test('maps ERR_NETWORK to network_error', async () => {
			mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

			const files = [createTestFile('img.jpg', 'image/jpeg', 1_024)];
			const result = await uploadGalleryImages('raffle-1', files);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
			}
		});

		test('maps ECONNABORTED to timeout_error', async () => {
			mockPost.mockRejectedValueOnce(
				mockAxiosError({ code: 'ECONNABORTED' }),
			);

			const files = [createTestFile('img.jpg', 'image/jpeg', 1_024)];
			const result = await uploadGalleryImages('raffle-1', files);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.TIMEOUT_ERROR);
			}
		});
	});

	describe('HTTP status fallbacks', () => {
		test('maps 401 to unauthorized', async () => {
			mockPost.mockRejectedValueOnce(mockAxiosError({ status: 401 }));

			const files = [createTestFile('img.jpg', 'image/jpeg', 1_024)];
			const result = await uploadGalleryImages('raffle-1', files);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.UNAUTHORIZED);
			}
		});

		test('maps 500 to internal_server_error', async () => {
			mockPost.mockRejectedValueOnce(mockAxiosError({ status: 500 }));

			const files = [createTestFile('img.jpg', 'image/jpeg', 1_024)];
			const result = await uploadGalleryImages('raffle-1', files);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
			}
		});
	});
});
