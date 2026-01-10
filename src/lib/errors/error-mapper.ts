import { AxiosError } from 'axios';

import {
	type AuthErrorCode,
	COMMON_ERROR_CODES,
	type RaffleErrorCode,
} from '@/types/errors';

/**
 * Error Mapper Utilities
 *
 * Maps backend error codes and HTTP status codes to frontend error codes.
 * Handles both RFC 7807 URN format and simple code format from backend.
 * Provides service-specific mapping functions for different API domains.
 */

/**
 * Extracts error code from backend response
 * Handles both RFC 7807 (with URN) and simple format (code + message)
 *
 * @param error - The caught error (usually AxiosError)
 * @returns The extracted error code or null if not found
 *
 * @example
 * // RFC 7807 format
 * // { type: "urn:raffles:problem:auth:user:invalid-credentials", ... }
 * // Returns: "auth:user:invalid-credentials"
 *
 * // Simple format
 * // { code: "unauthenticated", message: "Invalid credentials" }
 * // Returns: "unauthenticated"
 */
function extractErrorCode(error: unknown): string | null {
	if (!(error instanceof AxiosError) || !error.response?.data) {
		return null;
	}

	const data = error.response.data;

	// 1. Try RFC 7807 'type' field (URN format) - PREFERRED
	if (data.type && typeof data.type === 'string') {
		const urnMatch = data.type.match(/^urn:raffles:problem:(.+)$/);
		if (urnMatch) {
			return urnMatch[1]; // Returns "auth:user:invalid-credentials"
		}
	}

	// 2. Fallback to 'code' field (simple format)
	if (data.code && typeof data.code === 'string') {
		return data.code; // Returns "unauthenticated"
	}

	// 3. Fallback to 'message' field (if it's a code-like string)
	if (
		data.message &&
		typeof data.message === 'string' &&
		data.message.includes(':')
	) {
		return data.message; // Returns "auth:user:invalid-credentials"
	}

	return null;
}

/**
 * Maps simple backend codes to our full error codes
 * Example: "unauthenticated" → "global:auth:unauthenticated"
 *
 * @param code - The simple code from backend
 * @returns The full error code or the original code if no mapping exists
 */
function mapSimpleCode(code: string): string {
	const SIMPLE_CODE_MAP: Record<string, string> = {
		unauthenticated: 'global:auth:unauthenticated',
		permission_denied: 'forbidden',
		not_found: 'not_found', // Keep as is, will be contextualized by service
		invalid_argument: 'validation_error',
	};

	return SIMPLE_CODE_MAP[code] || code;
}

/**
 * Fallback mapping for network errors and HTTP status codes
 * Used when we cannot extract a specific error code from the backend response
 *
 * @param error - The caught error (usually AxiosError)
 * @returns A common error code representing the error type
 */
function mapCommonError(
	error: unknown,
): (typeof COMMON_ERROR_CODES)[keyof typeof COMMON_ERROR_CODES] {
	if (!(error instanceof AxiosError)) {
		return COMMON_ERROR_CODES.UNKNOWN_ERROR;
	}

	// Network/timeout errors
	if (error.code === 'ECONNABORTED') {
		return COMMON_ERROR_CODES.TIMEOUT_ERROR;
	}
	if (error.code === 'ERR_NETWORK') {
		return COMMON_ERROR_CODES.NETWORK_ERROR;
	}

	// HTTP status codes (when no specific error code from backend)
	if (error.response) {
		const status = error.response.status;
		if (status === 401) return COMMON_ERROR_CODES.UNAUTHORIZED;
		if (status === 403) return COMMON_ERROR_CODES.FORBIDDEN;
		if (status === 500) return COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR;
		if (status === 503) return COMMON_ERROR_CODES.SERVICE_UNAVAILABLE;
	}

	return COMMON_ERROR_CODES.UNKNOWN_ERROR;
}

/**
 * Generic error mapper for any service error code type
 * Maps backend error codes to frontend error codes with fallbacks
 *
 * @param error - The caught error (usually AxiosError)
 * @param errorCodeMap - Mapping of backend codes to frontend codes
 * @param defaultErrorCode - Fallback error code when no mapping exists
 * @returns The mapped frontend error code
 *
 * @deprecated Use extractErrorCode() + mapSimpleCode() + mapCommonError() instead
 */
export function mapBackendError<TErrorCode extends string>(
	error: unknown,
	errorCodeMap: Record<string, TErrorCode>,
	defaultErrorCode: TErrorCode,
): TErrorCode {
	if (!(error instanceof AxiosError)) {
		return defaultErrorCode;
	}

	// Extract backend error code
	const backendCode = error.response?.data?.message as string | undefined;

	// Map to frontend error code
	if (backendCode && backendCode in errorCodeMap) {
		return errorCodeMap[backendCode];
	}

	// Handle common HTTP status codes
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

	// Handle network errors
	if (error.code === 'ECONNABORTED') {
		return COMMON_ERROR_CODES.TIMEOUT_ERROR as TErrorCode;
	}
	if (error.code === 'ERR_NETWORK') {
		return COMMON_ERROR_CODES.NETWORK_ERROR as TErrorCode;
	}

	return defaultErrorCode;
}

/**
 * Maps auth-related backend errors to frontend error codes
 * Handles both full codes (auth:*, global:*) and simple codes (unauthenticated)
 *
 * @param error - The caught error (usually AxiosError)
 * @returns The mapped auth error code
 *
 * @example
 * try {
 *   await baseClient.post('/auth/sign-in', data);
 * } catch (error) {
 *   return failure(mapAuthError(error));
 * }
 */
export function mapAuthError(error: unknown): AuthErrorCode {
	const extractedCode = extractErrorCode(error);

	if (extractedCode) {
		// If full code with prefix (auth:*, global:*), use directly
		if (
			extractedCode.startsWith('auth:') ||
			extractedCode.startsWith('global:')
		) {
			return extractedCode as AuthErrorCode;
		}

		// If simple code (unauthenticated), map it
		const mappedCode = mapSimpleCode(extractedCode);
		if (mappedCode.startsWith('auth:') || mappedCode.startsWith('global:')) {
			return mappedCode as AuthErrorCode;
		}
	}

	// Fallback to common errors (network, timeout, HTTP status)
	return mapCommonError(error);
}

/**
 * Maps raffle/core related backend errors to frontend error codes
 * Handles both full codes (core:*, global:*) and simple codes
 *
 * @param error - The caught error (usually AxiosError)
 * @returns The mapped raffle error code
 *
 * @example
 * try {
 *   await authenticatedClient.post('/raffles', data);
 * } catch (error) {
 *   return failure(mapRaffleError(error));
 * }
 */
export function mapRaffleError(error: unknown): RaffleErrorCode {
	const extractedCode = extractErrorCode(error);

	if (extractedCode) {
		// If full code with prefix (core:*, global:*), use directly
		if (
			extractedCode.startsWith('core:') ||
			extractedCode.startsWith('global:')
		) {
			return extractedCode as RaffleErrorCode;
		}

		// If simple code, map it
		const mappedCode = mapSimpleCode(extractedCode);
		if (mappedCode.startsWith('core:') || mappedCode.startsWith('global:')) {
			return mappedCode as RaffleErrorCode;
		}
	}

	// Fallback to common errors (network, timeout, HTTP status)
	return mapCommonError(error);
}
