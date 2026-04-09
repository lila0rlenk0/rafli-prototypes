import { AxiosError } from 'axios';

import {
	type AdminKycErrorCode,
	type AuthErrorCode,
	type CommentErrorCode,
	COMMON_ERROR_CODES,
	type HostErrorCode,
	type KycSubmissionErrorCode,
	type NotificationErrorCode,
	type OrderErrorCode,
	type PaymentErrorCode,
	type PromoCodeErrorCode,
	type RaffleErrorCode,
	type ReportErrorCode,
	type WalletErrorCode,
	type ReviewErrorCode,
	type TicketErrorCode,
	type UpdateErrorCode,
	type VerificationErrorCode,
	type WinningErrorCode,
} from '@/types/errors';

/**
 * Error Mapper Utilities
 *
 * Maps backend error codes to frontend error codes with proper fallbacks.
 *
 * Backend errors come in RFC 7807 ProblemDetails format:
 * - `type`: URN like "urn:raffles:problem:auth:user:invalid-credentials"
 * - Extracted code: "auth:user:invalid-credentials"
 *
 * Error code prefixes indicate source:
 * - `global:*`   → Backend cross-cutting middleware (rate limit, auth guard, uploads)
 * - `auth:*`     → Backend authentication service
 * - `core:*`     → Backend core business logic
 * - `payments:*` → Backend payments service
 * - `snake_case` → Frontend-only (network errors, HTTP status fallbacks)
 */

// Hoisted RegExp — avoid re-creation on every extractErrorCode call
const RE_URN_PREFIX = /^urn:raffles:problem:(.+)$/;

/**
 * Extracts error code from backend RFC 7807 response
 *
 * Handles multiple response formats:
 * 1. RFC 7807 `type` field (URN) → extracts code after "urn:raffles:problem:"
 * 2. `message` field containing colon-separated code
 * 3. Simple `code` field
 *
 * @param error - Axios error with response data
 * @returns Extracted error code or null
 */
function extractErrorCode(error: unknown): string | null {
	// Step 1: Ensure Axios error with response data.
	if (!(error instanceof AxiosError) || !error.response?.data) {
		return null;
	}

	const data = error.response.data;

	// Step 2: Try RFC 7807 'type' field (e.g. "urn:raffles:problem:auth:user:invalid-credentials").
	// Returns: "auth:user:invalid-credentials"
	if (data.type && typeof data.type === 'string') {
		const urnMatch = data.type.match(RE_URN_PREFIX);
		if (urnMatch) {
			return urnMatch[1];
		}
	}

	// Step 3: Try 'message' field with colon-separated code (e.g. "auth:user:invalid-credentials").
	// (Some endpoints return code in message field)
	if (
		data.message &&
		typeof data.message === 'string' &&
		data.message.includes(':')
	) {
		return data.message;
	}

	// Step 4: Try simple 'code' field (e.g. "unauthenticated").
	// (Legacy format or simple error codes)
	if (data.code && typeof data.code === 'string') {
		return data.code;
	}

	return null;
}

/** Hoisted to module scope to avoid re-allocation on every call */
const SIMPLE_CODE_MAP: Record<string, string> = {
	unauthenticated: 'global:auth:unauthenticated',
	permission_denied: 'forbidden',
	not_found: 'not_found',
	invalid_argument: 'validation_error',
	// better-auth plugin codes
	PASSWORD_COMPROMISED: 'auth:password:compromised',
};

/**
 * Normalizes simple backend codes to their full qualified equivalents.
 * Some endpoints return shorthand codes like "unauthenticated" instead of
 * "global:auth:unauthenticated" — this maps those to canonical form so
 * prefix-based routing in domain mappers works correctly.
 *
 * @param code - Raw code from backend response
 * @returns Normalized code, or original if no mapping exists
 */
function mapSimpleCode(code: string): string {
	return SIMPLE_CODE_MAP[code] || code;
}

/**
 * Maps network/HTTP errors to frontend-only error codes
 *
 * Called when:
 * 1. No backend error code could be extracted
 * 2. Request failed before reaching backend (network error)
 * 3. Backend returned HTTP status without specific error code
 *
 * These are frontend-only codes (snake_case) - never from backend.
 *
 * @param error - Axios error
 * @returns Frontend-only CommonErrorCode
 */
function mapCommonError(
	error: unknown,
): (typeof COMMON_ERROR_CODES)[keyof typeof COMMON_ERROR_CODES] {
	if (!(error instanceof AxiosError)) return COMMON_ERROR_CODES.UNKNOWN_ERROR;

	// Step 1: Check axios error codes — request never reached backend.
	if (error.code === 'ECONNABORTED') return COMMON_ERROR_CODES.TIMEOUT_ERROR;
	if (error.code === 'ERR_NETWORK') return COMMON_ERROR_CODES.NETWORK_ERROR;
	if (error.code === 'ERR_BAD_REQUEST')
		return COMMON_ERROR_CODES.VALIDATION_ERROR;

	// Step 2: HTTP status fallbacks — backend returned status without an error body.
	if (error.response) {
		const { status } = error.response;
		if (status === 400) return COMMON_ERROR_CODES.VALIDATION_ERROR;
		if (status === 401) return COMMON_ERROR_CODES.UNAUTHORIZED;
		if (status === 403) return COMMON_ERROR_CODES.FORBIDDEN;
		if (status === 500) return COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR;
		if (status === 503) return COMMON_ERROR_CODES.SERVICE_UNAVAILABLE;
	}

	return COMMON_ERROR_CODES.UNKNOWN_ERROR;
}

/**
 * Maps authentication errors to AuthErrorCode
 *
 * Flow:
 * 1. Extract backend code from RFC 7807 response
 * 2. If code starts with `auth:` or `global:` → use as-is (backend code)
 * 3. If simple code → map to full code
 * 4. If no code found → fallback to frontend-only error (network/HTTP status)
 *
 * @param error - Caught error (usually AxiosError)
 * @returns AuthErrorCode (either backend code or frontend fallback)
 */
export function mapAuthError(error: unknown): AuthErrorCode {
	const extractedCode = extractErrorCode(error);

	if (extractedCode) {
		if (
			extractedCode.startsWith('auth:') ||
			extractedCode.startsWith('global:')
		) {
			return extractedCode as AuthErrorCode;
		}

		// Handles shorthand codes e.g. "unauthenticated" → "global:auth:unauthenticated"
		const mappedCode = mapSimpleCode(extractedCode);
		if (mappedCode.startsWith('auth:') || mappedCode.startsWith('global:')) {
			return mappedCode as AuthErrorCode;
		}
	}

	return mapCommonError(error);
}

/**
 * Maps raffle/core errors to RaffleErrorCode
 *
 * Same flow as mapAuthError but accepts `core:*` prefix for raffle operations.
 *
 * @param error - Caught error (usually AxiosError)
 * @returns RaffleErrorCode (either backend code or frontend fallback)
 */
export function mapRaffleError(error: unknown): RaffleErrorCode {
	const extractedCode = extractErrorCode(error);

	if (extractedCode) {
		if (
			extractedCode.startsWith('core:') ||
			extractedCode.startsWith('global:')
		) {
			return extractedCode as RaffleErrorCode;
		}

		const mappedCode = mapSimpleCode(extractedCode);
		if (mappedCode.startsWith('core:') || mappedCode.startsWith('global:')) {
			return mappedCode as RaffleErrorCode;
		}
	}

	return mapCommonError(error);
}

/**
 * Maps order errors to OrderErrorCode
 *
 * Accepts `core:order:*`, `core:raffle:*`, and `global:*` prefixes.
 *
 * @param error - Caught error (usually AxiosError)
 * @returns OrderErrorCode (either backend code or frontend fallback)
 */
export function mapOrderError(error: unknown): OrderErrorCode {
	const extractedCode = extractErrorCode(error);

	if (extractedCode) {
		if (
			extractedCode.startsWith('core:order:') ||
			extractedCode.startsWith('core:raffle:') ||
			extractedCode.startsWith('global:')
		) {
			return extractedCode as OrderErrorCode;
		}

		const mappedCode = mapSimpleCode(extractedCode);
		if (
			mappedCode.startsWith('core:order:') ||
			mappedCode.startsWith('core:raffle:') ||
			mappedCode.startsWith('global:')
		) {
			return mappedCode as OrderErrorCode;
		}
	}

	return mapCommonError(error);
}

/**
 * Maps wallet errors to WalletErrorCode
 *
 * Accepts `auth:wallet:*` and `global:*` prefixes.
 *
 * @param error - Caught error (usually AxiosError)
 * @returns WalletErrorCode (either backend code or frontend fallback)
 */
export function mapWalletError(error: unknown): WalletErrorCode {
	const extractedCode = extractErrorCode(error);

	if (extractedCode) {
		if (
			extractedCode.startsWith('auth:wallet:') ||
			extractedCode.startsWith('global:')
		) {
			return extractedCode as WalletErrorCode;
		}

		const mappedCode = mapSimpleCode(extractedCode);
		if (
			mappedCode.startsWith('auth:wallet:') ||
			mappedCode.startsWith('global:')
		) {
			return mappedCode as WalletErrorCode;
		}
	}

	return mapCommonError(error);
}

/**
 * Maps payment errors to PaymentErrorCode
 *
 * Accepts `payments:*` and `global:*` prefixes.
 *
 * @param error - Caught error (usually AxiosError)
 * @returns PaymentErrorCode (either backend code or frontend fallback)
 */
export function mapPaymentError(error: unknown): PaymentErrorCode {
	const extractedCode = extractErrorCode(error);

	if (extractedCode) {
		// Accepts core:* because crypto checkout can return core:order:* errors
		if (
			extractedCode.startsWith('payments:') ||
			extractedCode.startsWith('core:') ||
			extractedCode.startsWith('global:')
		) {
			return extractedCode as PaymentErrorCode;
		}

		const mappedCode = mapSimpleCode(extractedCode);
		if (
			mappedCode.startsWith('payments:') ||
			mappedCode.startsWith('core:') ||
			mappedCode.startsWith('global:')
		) {
			return mappedCode as PaymentErrorCode;
		}
	}

	return mapCommonError(error);
}

/**
 * Maps ticket errors to TicketErrorCode
 *
 * Accepts `core:ticket:*` and `global:*` prefixes.
 *
 * @param error - Caught error (usually AxiosError)
 * @returns TicketErrorCode (either backend code or frontend fallback)
 */
export function mapTicketError(error: unknown): TicketErrorCode {
	const extractedCode = extractErrorCode(error);

	if (extractedCode) {
		if (
			extractedCode.startsWith('core:') ||
			extractedCode.startsWith('global:')
		) {
			return extractedCode as TicketErrorCode;
		}

		const mappedCode = mapSimpleCode(extractedCode);
		if (mappedCode.startsWith('core:') || mappedCode.startsWith('global:')) {
			return mappedCode as TicketErrorCode;
		}
	}

	return mapCommonError(error);
}

/**
 * Maps host errors to HostErrorCode
 *
 * Accepts `core:user:*` and `global:*` prefixes.
 *
 * @param error - Caught error (usually AxiosError)
 * @returns HostErrorCode (either backend code or frontend fallback)
 */
export function mapHostError(error: unknown): HostErrorCode {
	const extractedCode = extractErrorCode(error);

	if (extractedCode) {
		if (
			extractedCode.startsWith('core:') ||
			extractedCode.startsWith('global:')
		) {
			return extractedCode as HostErrorCode;
		}

		const mappedCode = mapSimpleCode(extractedCode);
		if (mappedCode.startsWith('core:') || mappedCode.startsWith('global:')) {
			return mappedCode as HostErrorCode;
		}
	}

	return mapCommonError(error);
}

/**
 * Maps winning errors to WinningErrorCode
 *
 * Accepts `core:winning:*` and `global:*` prefixes.
 *
 * @param error - Caught error (usually AxiosError)
 * @returns WinningErrorCode (either backend code or frontend fallback)
 */
export function mapWinningError(error: unknown): WinningErrorCode {
	const extractedCode = extractErrorCode(error);

	if (extractedCode) {
		if (
			extractedCode.startsWith('core:') ||
			extractedCode.startsWith('global:')
		) {
			return extractedCode as WinningErrorCode;
		}

		const mappedCode = mapSimpleCode(extractedCode);
		if (mappedCode.startsWith('core:') || mappedCode.startsWith('global:')) {
			return mappedCode as WinningErrorCode;
		}
	}

	return mapCommonError(error);
}

/**
 * Maps update errors to UpdateErrorCode
 *
 * Accepts `core:update:*`, `core:raffle:*`, and `global:*` prefixes.
 *
 * @param error - Caught error (usually AxiosError)
 * @returns UpdateErrorCode (either backend code or frontend fallback)
 */
export function mapUpdateError(error: unknown): UpdateErrorCode {
	const extractedCode = extractErrorCode(error);

	if (extractedCode) {
		if (
			extractedCode.startsWith('core:') ||
			extractedCode.startsWith('global:')
		) {
			return extractedCode as UpdateErrorCode;
		}

		const mappedCode = mapSimpleCode(extractedCode);
		if (mappedCode.startsWith('core:') || mappedCode.startsWith('global:')) {
			return mappedCode as UpdateErrorCode;
		}
	}

	return mapCommonError(error);
}

/**
 * Maps verification errors to VerificationErrorCode
 *
 * Accepts `core:verification:*` and `global:*` prefixes.
 *
 * @param error - Caught error (usually AxiosError)
 * @returns VerificationErrorCode (either backend code or frontend fallback)
 */
export function mapVerificationError(error: unknown): VerificationErrorCode {
	const extractedCode = extractErrorCode(error);

	if (extractedCode) {
		if (
			extractedCode.startsWith('core:') ||
			extractedCode.startsWith('global:')
		) {
			return extractedCode as VerificationErrorCode;
		}

		const mappedCode = mapSimpleCode(extractedCode);
		if (mappedCode.startsWith('core:') || mappedCode.startsWith('global:')) {
			return mappedCode as VerificationErrorCode;
		}
	}

	return mapCommonError(error);
}

/**
 * Maps notification errors to NotificationErrorCode
 *
 * Accepts `core:notification:*` and `global:*` prefixes.
 *
 * @param error - Caught error (usually AxiosError)
 * @returns NotificationErrorCode (either backend code or frontend fallback)
 */
export function mapNotificationError(error: unknown): NotificationErrorCode {
	const extractedCode = extractErrorCode(error);

	if (extractedCode) {
		if (
			extractedCode.startsWith('core:') ||
			extractedCode.startsWith('global:')
		) {
			return extractedCode as NotificationErrorCode;
		}

		const mappedCode = mapSimpleCode(extractedCode);
		if (mappedCode.startsWith('core:') || mappedCode.startsWith('global:')) {
			return mappedCode as NotificationErrorCode;
		}
	}

	return mapCommonError(error);
}

/**
 * Maps review errors to ReviewErrorCode
 *
 * Accepts `core:review:*`, `core:raffle:*`, and `global:*` prefixes.
 *
 * @param error - Caught error (usually AxiosError)
 * @returns ReviewErrorCode (either backend code or frontend fallback)
 */
export function mapReviewError(error: unknown): ReviewErrorCode {
	const extractedCode = extractErrorCode(error);

	if (extractedCode) {
		if (
			extractedCode.startsWith('core:') ||
			extractedCode.startsWith('global:')
		) {
			return extractedCode as ReviewErrorCode;
		}

		const mappedCode = mapSimpleCode(extractedCode);
		if (mappedCode.startsWith('core:') || mappedCode.startsWith('global:')) {
			return mappedCode as ReviewErrorCode;
		}
	}

	return mapCommonError(error);
}

/**
 * Maps comment errors to CommentErrorCode
 *
 * Accepts `core:comment:*`, `core:raffle:*`, and `global:*` prefixes.
 *
 * @param error - Caught error (usually AxiosError)
 * @returns CommentErrorCode (either backend code or frontend fallback)
 */
export function mapCommentError(error: unknown): CommentErrorCode {
	const extractedCode = extractErrorCode(error);

	if (extractedCode) {
		if (
			extractedCode.startsWith('core:') ||
			extractedCode.startsWith('global:')
		) {
			return extractedCode as CommentErrorCode;
		}

		const mappedCode = mapSimpleCode(extractedCode);
		if (mappedCode.startsWith('core:') || mappedCode.startsWith('global:')) {
			return mappedCode as CommentErrorCode;
		}
	}

	return mapCommonError(error);
}

/**
 * Maps report errors to ReportErrorCode
 *
 * Accepts `moderation:*` and `global:*` prefixes.
 *
 * @param error - Caught error (usually AxiosError)
 * @returns ReportErrorCode (either backend code or frontend fallback)
 */
export function mapReportError(error: unknown): ReportErrorCode {
	const extractedCode = extractErrorCode(error);

	if (extractedCode) {
		if (
			extractedCode.startsWith('moderation:') ||
			extractedCode.startsWith('global:')
		) {
			return extractedCode as ReportErrorCode;
		}

		const mappedCode = mapSimpleCode(extractedCode);
		if (
			mappedCode.startsWith('moderation:') ||
			mappedCode.startsWith('global:')
		) {
			return mappedCode as ReportErrorCode;
		}
	}

	return mapCommonError(error);
}

/**
 * Maps promo code errors to PromoCodeErrorCode
 *
 * Accepts `core:promo:*`, `core:raffle:*`, and `global:*` prefixes.
 *
 * @param error - Caught error (usually AxiosError)
 * @returns PromoCodeErrorCode (either backend code or frontend fallback)
 */
export function mapPromoCodeError(error: unknown): PromoCodeErrorCode {
	const extractedCode = extractErrorCode(error);

	if (extractedCode) {
		if (
			extractedCode.startsWith('core:') ||
			extractedCode.startsWith('global:')
		) {
			return extractedCode as PromoCodeErrorCode;
		}

		const mappedCode = mapSimpleCode(extractedCode);
		if (mappedCode.startsWith('core:') || mappedCode.startsWith('global:')) {
			return mappedCode as PromoCodeErrorCode;
		}
	}

	return mapCommonError(error);
}

/**
 * Maps KYC submission errors to KycSubmissionErrorCode
 *
 * Accepts `core:verification:*` and `global:*` prefixes.
 *
 * @param error - Caught error (usually AxiosError)
 * @returns KycSubmissionErrorCode (either backend code or frontend fallback)
 */
export function mapKycSubmissionError(error: unknown): KycSubmissionErrorCode {
	const extractedCode = extractErrorCode(error);

	if (extractedCode) {
		if (
			extractedCode.startsWith('core:') ||
			extractedCode.startsWith('global:')
		) {
			return extractedCode as KycSubmissionErrorCode;
		}

		const mappedCode = mapSimpleCode(extractedCode);
		if (mappedCode.startsWith('core:') || mappedCode.startsWith('global:')) {
			return mappedCode as KycSubmissionErrorCode;
		}
	}

	return mapCommonError(error);
}

/**
 * Maps admin KYC review errors to AdminKycErrorCode.
 *
 * Both AdminKycErrorCode and KycSubmissionErrorCode share the same backend
 * module (`core:verification:*`) and CommonErrorCode union — the extraction
 * logic is identical. The cast is sound because:
 * 1. CommonErrorCode (the mapCommonError fallback) is in both unions
 * 2. Backend `core:verification:*` strings are trusted at runtime
 *
 * @param error - Caught error (usually AxiosError)
 * @returns AdminKycErrorCode (either backend code or frontend fallback)
 */
export function mapAdminKycError(error: unknown): AdminKycErrorCode {
	// Cast sound: KycSubmissionErrorCode and AdminKycErrorCode are structurally
	// identical (same backend module + same CommonErrorCode fallback).
	return mapKycSubmissionError(error) as AdminKycErrorCode;
}
