import { describe, expect, test } from 'bun:test';

import { COMMON_ERROR_CODES } from '@/types/errors';

import { mockAxiosError } from '../../../tests/helpers/mock-axios';
import { mapAdminKycError, mapKycSubmissionError } from './error-mapper';

describe('mapKycSubmissionError', () => {
	describe('RFC 7807 backend codes', () => {
		test('extracts core:verification:* code from URN type', () => {
			const error = mockAxiosError({
				status: 409,
				data: {
					type: 'urn:raffles:problem:core:verification:already-pending',
				},
			});
			expect(mapKycSubmissionError(error)).toBe(
				'core:verification:already-pending',
			);
		});

		test('maps core:verification:not-pending from RFC 7807 type field', () => {
			const error = mockAxiosError({
				status: 400,
				data: {
					type: 'urn:raffles:problem:core:verification:not-pending',
				},
			});
			expect(mapKycSubmissionError(error)).toBe(
				'core:verification:not-pending',
			);
		});

		test('maps global:upload:invalid-file-type from RFC 7807 type field', () => {
			const error = mockAxiosError({
				status: 400,
				data: {
					type: 'urn:raffles:problem:global:upload:invalid-file-type',
				},
			});
			expect(mapKycSubmissionError(error)).toBe(
				'global:upload:invalid-file-type',
			);
		});

		test('extracts global:* code from URN type', () => {
			const error = mockAxiosError({
				status: 401,
				data: {
					type: 'urn:raffles:problem:global:auth:unauthenticated',
				},
			});
			expect(mapKycSubmissionError(error)).toBe('global:auth:unauthenticated');
		});
	});

	describe('HTTP status fallbacks', () => {
		test('maps 401 to unauthorized', () => {
			const error = mockAxiosError({ status: 401 });
			expect(mapKycSubmissionError(error)).toBe(
				COMMON_ERROR_CODES.UNAUTHORIZED,
			);
		});

		test('maps 403 to forbidden', () => {
			const error = mockAxiosError({ status: 403 });
			expect(mapKycSubmissionError(error)).toBe(COMMON_ERROR_CODES.FORBIDDEN);
		});

		test('maps 500 to internal_server_error', () => {
			const error = mockAxiosError({ status: 500 });
			expect(mapKycSubmissionError(error)).toBe(
				COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR,
			);
		});
	});

	describe('network errors', () => {
		test('maps ERR_NETWORK to network_error', () => {
			const error = mockAxiosError({ code: 'ERR_NETWORK' });
			expect(mapKycSubmissionError(error)).toBe(
				COMMON_ERROR_CODES.NETWORK_ERROR,
			);
		});

		test('maps ECONNABORTED to timeout_error', () => {
			const error = mockAxiosError({ code: 'ECONNABORTED' });
			expect(mapKycSubmissionError(error)).toBe(
				COMMON_ERROR_CODES.TIMEOUT_ERROR,
			);
		});
	});

	describe('non-Axios errors', () => {
		test('maps plain Error to unknown_error', () => {
			// Non-Axios errors have no status/code to extract — fall through to unknown
			expect(mapKycSubmissionError(new Error('boom'))).toBe(
				COMMON_ERROR_CODES.UNKNOWN_ERROR,
			);
		});

		test('maps null to unknown_error', () => {
			expect(mapKycSubmissionError(null)).toBe(
				COMMON_ERROR_CODES.UNKNOWN_ERROR,
			);
		});
	});
});

describe('mapAdminKycError', () => {
	describe('delegation to mapKycSubmissionError', () => {
		test('maps RFC 7807 verification codes identically', () => {
			const error = mockAxiosError({
				status: 409,
				data: {
					type: 'urn:raffles:problem:core:verification:already-reviewed',
				},
			});
			expect(mapAdminKycError(error)).toBe(
				'core:verification:already-reviewed',
			);
		});

		test('returns common error for network failures', () => {
			const error = mockAxiosError({ code: 'ERR_NETWORK' });
			expect(mapAdminKycError(error)).toBe(COMMON_ERROR_CODES.NETWORK_ERROR);
		});
	});
});
