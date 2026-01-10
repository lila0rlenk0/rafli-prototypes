/**
 * Common Error Codes
 *
 * Shared error codes used across all services.
 * Includes both backend "global:*" codes and frontend fallback codes.
 *
 * Backend global codes are extracted from RFC 7807 responses.
 * Fallback codes are used for network/timeout errors that don't come from backend.
 */

/**
 * Common error codes constant object
 * Use these values when returning errors from services
 */
export const COMMON_ERROR_CODES = {
	// Global backend errors - Authentication
	/** User is not authenticated (from backend) */
	GLOBAL_AUTH_UNAUTHENTICATED: 'global:auth:unauthenticated',

	// Global backend errors - Upload
	/** File size exceeds the limit (from backend) */
	GLOBAL_UPLOAD_FILE_TOO_LARGE: 'global:upload:file-too-large',
	/** Invalid image file (from backend) */
	GLOBAL_UPLOAD_INVALID_IMAGE: 'global:upload:invalid-image',

	// Global backend errors - Rate limiting
	/** Rate limit exceeded (from backend) */
	GLOBAL_RATELIMIT_EXCEEDED: 'global:ratelimit:exceeded',

	// Network errors (frontend fallback - not from backend)
	NETWORK_ERROR: 'network_error',
	TIMEOUT_ERROR: 'timeout_error',
	CONNECTION_ABORTED: 'connection_aborted',

	// Server errors (frontend fallback for HTTP status without specific code)
	INTERNAL_SERVER_ERROR: 'internal_server_error',
	SERVICE_UNAVAILABLE: 'service_unavailable',

	// Client errors (frontend fallback)
	INVALID_REQUEST: 'invalid_request',
	VALIDATION_ERROR: 'validation_error',

	// Authentication/Authorization (frontend fallback for HTTP status)
	UNAUTHORIZED: 'unauthorized',
	FORBIDDEN: 'forbidden',
	SESSION_EXPIRED: 'session_expired',

	// Unknown/Unexpected (final fallback)
	UNKNOWN_ERROR: 'unknown_error',
} as const;

/**
 * Common error code type
 * Represents all possible common error codes
 */
export type CommonErrorCode =
	(typeof COMMON_ERROR_CODES)[keyof typeof COMMON_ERROR_CODES];
