import { describe, expect, test } from 'bun:test';
import { AxiosError } from 'axios';

import {
	mapAuthError,
	mapCommentError,
	mapHostError,
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
				message: 'auth:password:too-weak',
			});
			expect(mapAuthError(error)).toBe('auth:password:too-weak');
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

		test('returns forbidden for 403 status', () => {
			expect(mapAuthError(makeStatusError(403))).toBe('forbidden');
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
			type: 'urn:raffles:problem:core:order:already-exists',
		});
		expect(mapOrderError(error)).toBe('core:order:already-exists');
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
			type: 'urn:raffles:problem:auth:wallet:already-linked',
		});
		expect(mapWalletError(error)).toBe('auth:wallet:already-linked');
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
			type: 'urn:raffles:problem:payments:card:declined',
		});
		expect(mapPaymentError(error)).toBe('payments:card:declined');
	});

	test('accepts core: prefix for crypto checkout', () => {
		const error = makeAxiosError({
			type: 'urn:raffles:problem:core:order:expired',
		});
		expect(mapPaymentError(error)).toBe('core:order:expired');
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

	test('rejects core: prefix', () => {
		const error = makeAxiosError({
			type: 'urn:raffles:problem:core:raffle:not-found',
		});
		expect(mapReportError(error)).toBe('validation_error');
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
				expect(fn(error)).toBe('core:resource:not-found');
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
