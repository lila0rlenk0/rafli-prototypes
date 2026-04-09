import { describe, expect, mock, test } from 'bun:test';

import { CLIENT_ERROR_CODES } from '@/types/errors/client-errors';
import { UPDATE_ERROR_CODES } from '@/types/errors/update-errors';
import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';

import { mockAxiosError, mockAxiosResponse } from '../../../helpers/mock-axios';

const mockPost = mock();

mock.module('@/lib/api/client', () => ({
	authenticatedClient: { get: mock(), post: mockPost },
	baseClient: { get: mock() },
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mock(),
}));
mock.module('@/lib/api/config', () => ({
	API_TIMEOUTS: { UPLOAD: 60_000, QUERY: 10_000, MUTATION: 15_000 },
}));

const { uploadUpdateImages } = await import(
	'@/services/update/upload-update-images'
);

/** Helper to create a mock File */
function createMockFile(name: string, type: string, size: number): File {
	const buffer = new ArrayBuffer(size);
	return new File([buffer], name, { type });
}

describe('uploadUpdateImages', () => {
	test('returns validated image URLs on success', async () => {
		mockPost.mockResolvedValueOnce(
			mockAxiosResponse({ imageUrls: ['/uploads/img1.png'] }),
		);

		const files = [createMockFile('test.png', 'image/png', 1_000)];
		const result = await uploadUpdateImages('update-1', files);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.imageUrls).toHaveLength(1);
		}
	});

	test('returns UPLOAD_INVALID_TYPE for empty file array', async () => {
		const result = await uploadUpdateImages('update-1', []);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(CLIENT_ERROR_CODES.UPLOAD_INVALID_TYPE);
		}
	});

	test('returns UPLOAD_TOO_MANY_FILES for more than 5 files', async () => {
		const files = Array.from({ length: 6 }, (_, i) =>
			createMockFile(`img${i}.png`, 'image/png', 1_000),
		);

		const result = await uploadUpdateImages('update-1', files);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(CLIENT_ERROR_CODES.UPLOAD_TOO_MANY_FILES);
		}
	});

	test('returns UPLOAD_INVALID_TYPE for unsupported MIME type', async () => {
		const files = [createMockFile('doc.pdf', 'application/pdf', 1_000)];

		const result = await uploadUpdateImages('update-1', files);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(CLIENT_ERROR_CODES.UPLOAD_INVALID_TYPE);
		}
	});

	test('returns UPLOAD_TOO_LARGE for file exceeding 5MB', async () => {
		// 6MB exceeds the 5MB limit
		const files = [createMockFile('big.png', 'image/png', 6 * 1024 * 1024)];

		const result = await uploadUpdateImages('update-1', files);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(CLIENT_ERROR_CODES.UPLOAD_TOO_LARGE);
		}
	});

	test('returns FETCH_FAILED on invalid response shape', async () => {
		mockPost.mockResolvedValueOnce(mockAxiosResponse({ bad: true }));

		const files = [createMockFile('test.png', 'image/png', 1_000)];
		const result = await uploadUpdateImages('update-1', files);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(UPDATE_ERROR_CODES.FETCH_FAILED);
		}
	});

	test('maps ERR_NETWORK to network_error', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const files = [createMockFile('test.png', 'image/png', 1_000)];
		const result = await uploadUpdateImages('update-1', files);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
		}
	});
});
