import { describe, expect, mock, test } from 'bun:test';

import { KYC_SUBMISSION_ERROR_CODES } from '@/types/errors/kyc-submission-errors';
import { COMMON_ERROR_CODES } from '@/types/errors/common-errors';

import { mockAxiosError, mockAxiosResponse } from '@tests/helpers/mock-axios';

const mockPost = mock();

mock.module('@/lib/api/client', () => ({
	authenticatedClient: { get: mock(), post: mockPost },
	baseClient: { get: mock() },
}));
mock.module('@/lib/sentry/capture', () => ({
	captureContractDrift: mock(),
	captureServiceError: mock(),
}));
mock.module('@/lib/api/constants', () => ({
	API_TIMEOUTS: { UPLOAD: 60_000, QUERY: 10_000, MUTATION: 15_000 },
}));

const { uploadDocument } = await import(
	'@/services/kyc-submission/upload-document'
);

/** Helper to create a mock File */
function createMockFile(name: string, type: string, size: number): File {
	const buffer = new ArrayBuffer(size);
	return new File([buffer], name, { type });
}

describe('uploadDocument', () => {
	test('returns validated document response on success', async () => {
		mockPost.mockResolvedValueOnce(
			mockAxiosResponse({ documentId: 'doc-1', purpose: 'id_front' }),
		);

		const file = createMockFile('id-front.jpg', 'image/jpeg', 1_000);
		const result = await uploadDocument('sub-1', 'id_front', file);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.documentId).toBe('doc-1');
			expect(result.data.purpose).toBe('id_front');
		}
	});

	test('returns DOCUMENT_UPLOAD_FAILED for unsupported MIME type', async () => {
		const file = createMockFile('doc.txt', 'text/plain', 1_000);
		const result = await uploadDocument('sub-1', 'id_front', file);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(KYC_SUBMISSION_ERROR_CODES.DOCUMENT_UPLOAD_FAILED);
		}
	});

	test('returns DOCUMENT_UPLOAD_FAILED for file exceeding 10MB', async () => {
		// 11MB exceeds the MAX_DOC_SIZE of 10MB
		const file = createMockFile('big.pdf', 'application/pdf', 11 * 1024 * 1024);
		const result = await uploadDocument('sub-1', 'id_front', file);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(KYC_SUBMISSION_ERROR_CODES.DOCUMENT_UPLOAD_FAILED);
		}
	});

	test('returns FETCH_FAILED on invalid response shape', async () => {
		mockPost.mockResolvedValueOnce(mockAxiosResponse({ bad: true }));

		const file = createMockFile('id.pdf', 'application/pdf', 1_000);
		const result = await uploadDocument('sub-1', 'id_front', file);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(KYC_SUBMISSION_ERROR_CODES.FETCH_FAILED);
		}
	});

	test('maps not-found from RFC 7807', async () => {
		mockPost.mockRejectedValueOnce(
			mockAxiosError({
				status: 404,
				data: { type: 'urn:raffles:problem:core:verification:not-found' },
			}),
		);

		const file = createMockFile('id.pdf', 'application/pdf', 1_000);
		const result = await uploadDocument('bad-id', 'id_front', file);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(KYC_SUBMISSION_ERROR_CODES.NOT_FOUND);
		}
	});

	test('maps ERR_NETWORK to network_error', async () => {
		mockPost.mockRejectedValueOnce(mockAxiosError({ code: 'ERR_NETWORK' }));

		const file = createMockFile('id.pdf', 'application/pdf', 1_000);
		const result = await uploadDocument('sub-1', 'id_front', file);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
		}
	});
});
