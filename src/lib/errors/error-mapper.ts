import { AxiosError } from 'axios';

import {
	type AuthErrorCode,
	type CommentErrorCode,
	COMMON_ERROR_CODES,
	type HostErrorCode,
	type NotificationErrorCode,
	type OrderErrorCode,
	type PaymentErrorCode,
	type PromoCodeErrorCode,
	type RaffleErrorCode,
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
		const urnMatch = data.type.match(/^urn:raffles:problem:(.+)$/);
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

/**
 * Maps simple backend codes to full error codes
 *
 * Some endpoints return simple codes like "unauthenticated" instead of
 * full codes like "global:auth:unauthenticated". This normalizes them.
 *
 * @param code - Simple code from backend
 * @returns Full error code or original if no mapping
 */
function mapSimpleCode(code: string): string {
	const SIMPLE_CODE_MAP: Record<string, string> = {
		// Simple code → Full backend code
		unauthenticated: 'global:auth:unauthenticated',
		permission_denied: 'forbidden',
		not_found: 'not_found',
		invalid_argument: 'validation_error',
		// better-auth plugin codes
		PASSWORD_COMPROMISED: 'auth:password:compromised',
	};

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
	if (!(error instanceof AxiosError)) {
		// Not an axios error - unknown source
		return COMMON_ERROR_CODES.UNKNOWN_ERROR;
	}

	// -----------------------------------------------------------------
	// Network errors - request never reached backend
	// Detected via axios error.code property
	// -----------------------------------------------------------------

	if (error.code === 'ECONNABORTED') {
		// Request timeout - axios aborted after timeout period
		return COMMON_ERROR_CODES.TIMEOUT_ERROR;
	}
	if (error.code === 'ERR_NETWORK') {
		// No network - device offline or server unreachable
		return COMMON_ERROR_CODES.NETWORK_ERROR;
	}
	if (error.code === 'ERR_BAD_REQUEST') {
		// Malformed request - axios couldn't send it
		return COMMON_ERROR_CODES.VALIDATION_ERROR;
	}

	// -----------------------------------------------------------------
	// HTTP status fallbacks - backend returned status without error code
	// Used when extractErrorCode() returned null
	// -----------------------------------------------------------------

	if (error.response) {
		const status = error.response.status;

		// Client errors (4xx)
		if (status === 400) return COMMON_ERROR_CODES.VALIDATION_ERROR;
		if (status === 401) return COMMON_ERROR_CODES.UNAUTHORIZED;
		if (status === 403) return COMMON_ERROR_CODES.FORBIDDEN;

		// Server errors (5xx)
		if (status === 500) return COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR;
		if (status === 503) return COMMON_ERROR_CODES.SERVICE_UNAVAILABLE;
	}

	// Catch-all for unhandled cases
	return COMMON_ERROR_CODES.UNKNOWN_ERROR;
}

/**
 * Generic error mapper (deprecated)
 *
 * @deprecated Use service-specific mappers: mapAuthError, mapRaffleError, etc.
 */
export function mapBackendError<TErrorCode extends string>(
	error: unknown,
	errorCodeMap: Record<string, TErrorCode>,
	defaultErrorCode: TErrorCode,
): TErrorCode {
	if (!(error instanceof AxiosError)) {
		return defaultErrorCode;
	}

	const backendCode = error.response?.data?.message as string | undefined;

	if (backendCode && backendCode in errorCodeMap) {
		return errorCodeMap[backendCode];
	}

	const status = error.response?.status;
	if (status === 401) {
		return COMMON_ERROR_CODES.UNAUTHORIZED as TErrorCode;
	}
	if (status === 403) {
		return COMMON_ERROR_CODES.FORBIDDEN as TErrorCode;
	}
	if (status === 500) {
		return COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR as TErrorCode;
	}
	if (status === 503) {
		return COMMON_ERROR_CODES.SERVICE_UNAVAILABLE as TErrorCode;
	}

	if (error.code === 'ECONNABORTED') {
		return COMMON_ERROR_CODES.TIMEOUT_ERROR as TErrorCode;
	}
	if (error.code === 'ERR_NETWORK') {
		return COMMON_ERROR_CODES.NETWORK_ERROR as TErrorCode;
	}

	return defaultErrorCode;
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
		// Backend code with known prefix - use directly
		// Examples: "auth:user:invalid-credentials", "global:ratelimit:exceeded"
		if (
			extractedCode.startsWith('auth:') ||
			extractedCode.startsWith('global:')
		) {
			return extractedCode as AuthErrorCode;
		}

		// Simple code - try to map to full code
		// Example: "unauthenticated" → "global:auth:unauthenticated"
		const mappedCode = mapSimpleCode(extractedCode);
		if (mappedCode.startsWith('auth:') || mappedCode.startsWith('global:')) {
			return mappedCode as AuthErrorCode;
		}
	}

	// No backend code - use frontend-only fallback (network error or HTTP status)
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
		// Backend code with known prefix - use directly
		// Examples: "core:raffle:not-found", "global:upload:file-too-large"
		if (
			extractedCode.startsWith('core:') ||
			extractedCode.startsWith('global:')
		) {
			return extractedCode as RaffleErrorCode;
		}

		// Simple code - try to map
		const mappedCode = mapSimpleCode(extractedCode);
		if (mappedCode.startsWith('core:') || mappedCode.startsWith('global:')) {
			return mappedCode as RaffleErrorCode;
		}
	}

	// No backend code - use frontend-only fallback
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
		// Backend code with known prefix - use directly
		if (
			extractedCode.startsWith('core:order:') ||
			extractedCode.startsWith('core:raffle:') ||
			extractedCode.startsWith('global:')
		) {
			return extractedCode as OrderErrorCode;
		}

		// Simple code - try to map
		const mappedCode = mapSimpleCode(extractedCode);
		if (
			mappedCode.startsWith('core:order:') ||
			extractedCode.startsWith('core:raffle:') ||
			mappedCode.startsWith('global:')
		) {
			return mappedCode as OrderErrorCode;
		}
	}

	// No backend code - use frontend-only fallback
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
		// Backend code with known prefix - use directly
		// Examples: "payments:checkout:failed", "global:auth:unauthenticated"
		if (
			extractedCode.startsWith('payments:') ||
			extractedCode.startsWith('global:')
		) {
			return extractedCode as PaymentErrorCode;
		}

		// Simple code - try to map
		const mappedCode = mapSimpleCode(extractedCode);
		if (
			mappedCode.startsWith('payments:') ||
			mappedCode.startsWith('global:')
		) {
			return mappedCode as PaymentErrorCode;
		}
	}

	// No backend code - use frontend-only fallback
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
		// Backend code with known prefix - use directly
		// Examples: "core:ticket:no-tickets", "global:auth:unauthenticated"
		if (
			extractedCode.startsWith('core:') ||
			extractedCode.startsWith('global:')
		) {
			return extractedCode as TicketErrorCode;
		}

		// Simple code - try to map
		const mappedCode = mapSimpleCode(extractedCode);
		if (mappedCode.startsWith('core:') || mappedCode.startsWith('global:')) {
			return mappedCode as TicketErrorCode;
		}
	}

	// No backend code - use frontend-only fallback
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
		// Backend code with known prefix - use directly
		// Examples: "core:user:not-found", "global:auth:unauthenticated"
		if (
			extractedCode.startsWith('core:') ||
			extractedCode.startsWith('global:')
		) {
			return extractedCode as HostErrorCode;
		}

		// Simple code - try to map
		const mappedCode = mapSimpleCode(extractedCode);
		if (mappedCode.startsWith('core:') || mappedCode.startsWith('global:')) {
			return mappedCode as HostErrorCode;
		}
	}

	// No backend code - use frontend-only fallback
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
		// Backend code with known prefix - use directly
		// Examples: "core:winning:not-found", "global:auth:unauthenticated"
		if (
			extractedCode.startsWith('core:') ||
			extractedCode.startsWith('global:')
		) {
			return extractedCode as WinningErrorCode;
		}

		// Simple code - try to map
		const mappedCode = mapSimpleCode(extractedCode);
		if (mappedCode.startsWith('core:') || mappedCode.startsWith('global:')) {
			return mappedCode as WinningErrorCode;
		}
	}

	// No backend code - use frontend-only fallback
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
		// Backend code with known prefix - use directly
		// Examples: "core:update:not-found", "core:raffle:not-live", "global:auth:unauthenticated"
		if (
			extractedCode.startsWith('core:') ||
			extractedCode.startsWith('global:')
		) {
			return extractedCode as UpdateErrorCode;
		}

		// Simple code - try to map
		const mappedCode = mapSimpleCode(extractedCode);
		if (mappedCode.startsWith('core:') || mappedCode.startsWith('global:')) {
			return mappedCode as UpdateErrorCode;
		}
	}

	// No backend code - use frontend-only fallback
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
		// Backend code with known prefix - use directly
		// Examples: "core:verification:winner-not-found", "global:auth:unauthenticated"
		if (
			extractedCode.startsWith('core:') ||
			extractedCode.startsWith('global:')
		) {
			return extractedCode as VerificationErrorCode;
		}

		// Simple code - try to map
		const mappedCode = mapSimpleCode(extractedCode);
		if (mappedCode.startsWith('core:') || mappedCode.startsWith('global:')) {
			return mappedCode as VerificationErrorCode;
		}
	}

	// No backend code - use frontend-only fallback
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
		// Backend code with known prefix - use directly
		// Examples: "core:notification:not-found", "global:auth:unauthenticated"
		if (
			extractedCode.startsWith('core:') ||
			extractedCode.startsWith('global:')
		) {
			return extractedCode as NotificationErrorCode;
		}

		// Simple code - try to map
		const mappedCode = mapSimpleCode(extractedCode);
		if (mappedCode.startsWith('core:') || mappedCode.startsWith('global:')) {
			return mappedCode as NotificationErrorCode;
		}
	}

	// No backend code - use frontend-only fallback
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
		// Backend code with known prefix - use directly
		// Examples: "core:review:not-eligible", "global:auth:unauthenticated"
		if (
			extractedCode.startsWith('core:') ||
			extractedCode.startsWith('global:')
		) {
			return extractedCode as ReviewErrorCode;
		}

		// Simple code - try to map
		const mappedCode = mapSimpleCode(extractedCode);
		if (mappedCode.startsWith('core:') || mappedCode.startsWith('global:')) {
			return mappedCode as ReviewErrorCode;
		}
	}

	// No backend code - use frontend-only fallback
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
		// Backend code with known prefix - use directly
		// Examples: "core:comment:not-found", "core:raffle:not-commentable", "global:auth:unauthenticated"
		if (
			extractedCode.startsWith('core:') ||
			extractedCode.startsWith('global:')
		) {
			return extractedCode as CommentErrorCode;
		}

		// Simple code - try to map
		const mappedCode = mapSimpleCode(extractedCode);
		if (mappedCode.startsWith('core:') || mappedCode.startsWith('global:')) {
			return mappedCode as CommentErrorCode;
		}
	}

	// No backend code - use frontend-only fallback
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
		// Backend code with known prefix - use directly
		// Examples: "core:promo:not-found", "core:raffle:not-found", "global:auth:unauthenticated"
		if (
			extractedCode.startsWith('core:') ||
			extractedCode.startsWith('global:')
		) {
			return extractedCode as PromoCodeErrorCode;
		}

		// Simple code - try to map
		const mappedCode = mapSimpleCode(extractedCode);
		if (mappedCode.startsWith('core:') || mappedCode.startsWith('global:')) {
			return mappedCode as PromoCodeErrorCode;
		}
	}

	// No backend code - use frontend-only fallback
	return mapCommonError(error);
}
