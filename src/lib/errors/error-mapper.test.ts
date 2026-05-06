import { describe, expect, test } from 'bun:test';
import { AxiosError } from 'axios';

import { COMMON_ERROR_CODES } from '@/types/errors';

import { mockAxiosError } from '@tests/helpers/mock-axios';

import {
	mapAdminKycError,
	mapAuthError,
	mapChatError,
	mapCommentError,
	mapFanbasisPublicCreditError,
	mapHostError,
	mapKycSubmissionError,
	mapNotificationError,
	mapOrderError,
	mapPaymentError,
	mapPromoCodeError,
	mapRaffleError,
	mapReportError,
	mapReviewError,
	mapTicketError,
	mapUpdateError,
	mapVerificationError,
	mapWalletError,
	mapWinningError,
} from './error-mapper';

// ==========================================
// Helpers
// ==========================================

/**
 * Creates an AxiosError with RFC 7807 response data.
 * `type` field uses the URN format the backend returns.
 */
function makeAxiosError(
	data: Record<string, unknown>,
	status = 400,
): AxiosError {
	const error = new AxiosError('Request failed');
	error.response = {
		data,
		status,
		statusText: 'Bad Request',
		headers: {},
		config: {} as never,
	};
	return error;
}

/**
 * Creates an AxiosError with a specific axios error code (network-level).
 */
function makeNetworkError(code: string): AxiosError {
	const error = new AxiosError('Network error');
	error.code = code;
	return error;
}

/**
 * Creates an AxiosError with only an HTTP status (no error body).
 */
function makeStatusError(status: number): AxiosError {
	const error = new AxiosError('Request failed');
	error.response = {
		data: {},
		status,
		statusText: '',
		headers: {},
		config: {} as never,
	};
	return error;
}

// ==========================================
// mapAuthError
// ==========================================

describe('mapAuthError', () => {
	describe('RFC 7807 URN extraction', () => {
		test('extracts auth code from type URN', () => {
			const error = makeAxiosError({
				type: 'urn:raffles:problem:auth:user:invalid-credentials',
			});
			expect(mapAuthError(error)).toBe('auth:user:invalid-credentials');
		});

		test('extracts global code from type URN', () => {
			const error = makeAxiosError({
				type: 'urn:raffles:problem:global:auth:unauthenticated',
			});
			expect(mapAuthError(error)).toBe('global:auth:unauthenticated');
		});
	});

	describe('message field extraction', () => {
		test('extracts auth code from message field', () => {
			const error = makeAxiosError({
				message: 'auth:password:compromised',
			});
			expect(mapAuthError(error)).toBe('auth:password:compromised');
		});

		test('trims message-field codes before returning them', () => {
			const error = makeAxiosError({
				message: '  auth:password:compromised  ',
			});
			expect(mapAuthError(error)).toBe('auth:password:compromised');
		});

		test('does not treat arbitrary colon text as a machine error code', () => {
			// 404 — no `mapCommonError` branch; proves we did not use `data.message` as a code
			// (if we did, fallbacks would differ). 400 would yield validation_error and mask the intent.
			const error = makeAxiosError(
				{ message: 'Error: file /tmp/x: not found' },
				404,
			);
			expect(mapAuthError(error)).toBe('unknown_error');
		});
	});

	describe('simple code mapping', () => {
		test('maps "unauthenticated" to global:auth:unauthenticated', () => {
			const error = makeAxiosError({ code: 'unauthenticated' });
			expect(mapAuthError(error)).toBe('global:auth:unauthenticated');
		});

		test('maps "PASSWORD_COMPROMISED" to auth:password:compromised', () => {
			const error = makeAxiosError({ code: 'PASSWORD_COMPROMISED' });
			expect(mapAuthError(error)).toBe('auth:password:compromised');
		});

		// Better Auth captcha plugin emits these as bare uppercase codes in
		// `data.code`. Without the SIMPLE_CODE_MAP entry they collapse into the
		// 400/403 status fallbacks (validation_error / forbidden) and the user
		// sees a generic message instead of the actionable "retry verification".
		test('maps "VERIFICATION_FAILED" to auth:captcha:failed', () => {
			const error = makeAxiosError({ code: 'VERIFICATION_FAILED' }, 403);
			expect(mapAuthError(error)).toBe('auth:captcha:failed');
		});

		test('maps "MISSING_RESPONSE" to auth:captcha:missing', () => {
			const error = makeAxiosError({ code: 'MISSING_RESPONSE' }, 400);
			expect(mapAuthError(error)).toBe('auth:captcha:missing');
		});
	});

	describe('common error fallbacks', () => {
		test('returns timeout_error for ECONNABORTED', () => {
			expect(mapAuthError(makeNetworkError('ECONNABORTED'))).toBe(
				'timeout_error',
			);
		});

		test('returns network_error for ERR_NETWORK', () => {
			expect(mapAuthError(makeNetworkError('ERR_NETWORK'))).toBe(
				'network_error',
			);
		});

		test('returns unauthorized for 401 status', () => {
			expect(mapAuthError(makeStatusError(401))).toBe('unauthorized');
		});

		test('returns unauthorized for Axios ERR_BAD_REQUEST with 401 status', () => {
			expect(
				mapAuthError(mockAxiosError({ status: 401, code: 'ERR_BAD_REQUEST' })),
			).toBe('unauthorized');
		});

		test('returns forbidden for 403 status', () => {
			expect(mapAuthError(makeStatusError(403))).toBe('forbidden');
		});

		test('returns forbidden for Axios ERR_BAD_REQUEST with 403 status', () => {
			expect(
				mapAuthError(mockAxiosError({ status: 403, code: 'ERR_BAD_REQUEST' })),
			).toBe('forbidden');
		});

		test('returns internal_server_error for 500 status', () => {
			expect(mapAuthError(makeStatusError(500))).toBe('internal_server_error');
		});

		test('returns unknown_error for non-AxiosError', () => {
			expect(mapAuthError(new Error('random'))).toBe('unknown_error');
		});

		test('returns unknown_error for plain object', () => {
			expect(mapAuthError({ message: 'test' })).toBe('unknown_error');
		});
	});

	describe('unrecognized codes fall through to common', () => {
		test('ignores code with non-auth prefix', () => {
			const error = makeAxiosError({
				type: 'urn:raffles:problem:core:raffle:not-found',
			});
			// core: prefix not accepted by mapAuthError — falls to common error
			expect(mapAuthError(error)).toBe('validation_error');
		});
	});
});

// ==========================================
// mapRaffleError
// ==========================================

describe('mapRaffleError', () => {
	test('extracts core code from URN', () => {
		const error = makeAxiosError({
			type: 'urn:raffles:problem:core:raffle:not-found',
		});
		expect(mapRaffleError(error)).toBe('core:raffle:not-found');
	});

	test('extracts global code from URN', () => {
		const error = makeAxiosError({
			type: 'urn:raffles:problem:global:ratelimit:exceeded',
		});
		expect(mapRaffleError(error)).toBe('global:ratelimit:exceeded');
	});

	test('ignores auth-prefixed codes', () => {
		const error = makeAxiosError({
			type: 'urn:raffles:problem:auth:user:invalid-credentials',
		});
		expect(mapRaffleError(error)).toBe('validation_error');
	});

	test('falls back to common on network error', () => {
		expect(mapRaffleError(makeNetworkError('ERR_NETWORK'))).toBe(
			'network_error',
		);
	});
});

// ==========================================
// mapOrderError
// ==========================================

describe('mapOrderError', () => {
	test('accepts core:order: prefix', () => {
		const error = makeAxiosError({
			type: 'urn:raffles:problem:core:order:not-found',
		});
		expect(mapOrderError(error)).toBe('core:order:not-found');
	});

	test('accepts core:raffle: prefix', () => {
		const error = makeAxiosError({
			type: 'urn:raffles:problem:core:raffle:sold-out',
		});
		expect(mapOrderError(error)).toBe('core:raffle:sold-out');
	});

	test('accepts global: prefix', () => {
		const error = makeAxiosError({
			type: 'urn:raffles:problem:global:auth:unauthenticated',
		});
		expect(mapOrderError(error)).toBe('global:auth:unauthenticated');
	});
});

// ==========================================
// mapWalletError
// ==========================================

describe('mapWalletError', () => {
	test('accepts auth:wallet: prefix', () => {
		const error = makeAxiosError({
			type: 'urn:raffles:problem:auth:wallet:not-verified',
		});
		expect(mapWalletError(error)).toBe('auth:wallet:not-verified');
	});

	test('rejects core: prefix', () => {
		const error = makeAxiosError({
			type: 'urn:raffles:problem:core:raffle:not-found',
		});
		// core: not accepted — falls through to common
		expect(mapWalletError(error)).toBe('validation_error');
	});
});

// ==========================================
// mapPaymentError
// ==========================================

describe('mapPaymentError', () => {
	test('accepts payments: prefix', () => {
		const error = makeAxiosError({
			type: 'urn:raffles:problem:payments:checkout:failed',
		});
		expect(mapPaymentError(error)).toBe('payments:checkout:failed');
	});

	test('accepts core: prefix for crypto checkout', () => {
		const error = makeAxiosError({
			type: 'urn:raffles:problem:core:order:not-found',
		});
		expect(mapPaymentError(error)).toBe('core:order:not-found');
	});
});

// ==========================================
// mapChatError / mapReportError — message-field codes (F14)
// ==========================================

describe('mapChatError', () => {
	test('accepts chat: code from message field when URN and code are absent', () => {
		const error = makeAxiosError({ message: 'chat:room:not-found' }, 404);
		expect(mapChatError(error)).toBe('chat:room:not-found');
	});
});

// ==========================================
// mapReportError
// ==========================================

describe('mapReportError', () => {
	test('accepts moderation: prefix', () => {
		const error = makeAxiosError({
			type: 'urn:raffles:problem:moderation:report:duplicate',
		});
		expect(mapReportError(error)).toBe('moderation:report:duplicate');
	});

	test('accepts moderation: code from message field when URN and code are absent', () => {
		const error = makeAxiosError(
			{ message: 'moderation:report:duplicate' },
			404,
		);
		expect(mapReportError(error)).toBe('moderation:report:duplicate');
	});

	test('rejects core: prefix', () => {
		const error = makeAxiosError({
			type: 'urn:raffles:problem:core:raffle:not-found',
		});
		expect(mapReportError(error)).toBe('validation_error');
	});
});

// ==========================================
// mapFanbasisPublicCreditError
// ==========================================

describe('mapFanbasisPublicCreditError', () => {
	test('accepts payments:fanbasis: prefix', () => {
		const error = makeAxiosError({
			type: 'urn:raffles:problem:payments:fanbasis:rate-limited',
		});
		expect(mapFanbasisPublicCreditError(error)).toBe(
			'payments:fanbasis:rate-limited',
		);
	});

	test('accepts global: prefix for ratelimit fallback', () => {
		const error = makeAxiosError({
			type: 'urn:raffles:problem:global:ratelimit:exceeded',
		});
		expect(mapFanbasisPublicCreditError(error)).toBe(
			'global:ratelimit:exceeded',
		);
	});

	test('rejects the broader payments: namespace', () => {
		// `payments:stripe:*` is an authenticated-flow URN. Mapping it into the
		// public-credit surface would widen the allowed code set past Fanbasis.
		const error = makeAxiosError({
			type: 'urn:raffles:problem:payments:stripe:crypto-session-active',
		});
		expect(mapFanbasisPublicCreditError(error)).toBe('validation_error');
	});

	test('returns unknown_error for non-AxiosError', () => {
		expect(mapFanbasisPublicCreditError(new Error('boom'))).toBe(
			'unknown_error',
		);
	});
});

// ==========================================
// Shared pattern — remaining mappers follow same structure
// ==========================================

describe('domain mappers — shared pattern', () => {
	// All these mappers accept core: and global: prefixes
	const CORE_GLOBAL_MAPPERS = [
		{ name: 'mapTicketError', fn: mapTicketError },
		{ name: 'mapHostError', fn: mapHostError },
		{ name: 'mapWinningError', fn: mapWinningError },
		{ name: 'mapUpdateError', fn: mapUpdateError },
		{ name: 'mapVerificationError', fn: mapVerificationError },
		{ name: 'mapNotificationError', fn: mapNotificationError },
		{ name: 'mapReviewError', fn: mapReviewError },
		{ name: 'mapCommentError', fn: mapCommentError },
		{ name: 'mapPromoCodeError', fn: mapPromoCodeError },
	] as const;

	for (const { name, fn } of CORE_GLOBAL_MAPPERS) {
		describe(name, () => {
			test('extracts core: code', () => {
				const error = makeAxiosError({
					type: 'urn:raffles:problem:core:resource:not-found',
				});
				const extracted: string = fn(error);
				expect(extracted).toBe('core:resource:not-found');
			});

			test('extracts global: code', () => {
				const error = makeAxiosError({
					type: 'urn:raffles:problem:global:ratelimit:exceeded',
				});
				expect(fn(error)).toBe('global:ratelimit:exceeded');
			});

			test('maps "unauthenticated" simple code', () => {
				const error = makeAxiosError({ code: 'unauthenticated' });
				expect(fn(error)).toBe('global:auth:unauthenticated');
			});

			test('returns unknown_error for non-AxiosError', () => {
				expect(fn(new Error('boom'))).toBe('unknown_error');
			});

			test('returns service_unavailable for 503', () => {
				expect(fn(makeStatusError(503))).toBe('service_unavailable');
			});
		});
	}
});

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

		test('maps global:upload:invalid-content-type from RFC 7807 type field', () => {
			const error = mockAxiosError({
				status: 400,
				data: {
					type: 'urn:raffles:problem:global:upload:invalid-content-type',
				},
			});
			expect(mapKycSubmissionError(error)).toBe(
				'global:upload:invalid-content-type',
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
