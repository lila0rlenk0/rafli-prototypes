/**
 * Common Error Codes
 *
 * Two categories of error codes:
 *
 * 1. BACKEND ERRORS (`global:*` prefix)
 *    - Come from backend API responses via RFC 7807 ProblemDetails
 *    - Format: `global:{resource}:{error}` (e.g., `global:ratelimit:exceeded`)
 *    - Cross-cutting concerns: auth guards, rate limiting, file uploads, validation
 *    - Thrown by backend middleware/shared utilities that apply to ANY endpoint
 *
 * 2. FRONTEND-ONLY ERRORS (`snake_case`)
 *    - Detected client-side by axios interceptors
 *    - Never come from backend - generated when requests fail before reaching server
 *    - Examples: network disconnected, request timeout, HTTP status fallbacks
 */

/**
 * Common error codes constant object
 */
export const COMMON_ERROR_CODES = {
	// =========================================================================
	// BACKEND ERRORS - `global:*` prefix
	// These codes come directly from the backend API (RFC 7807 ProblemDetails)
	// Thrown by cross-cutting middleware that applies to all endpoints
	// =========================================================================

	// Authentication middleware (guards protected endpoints)
	/** Backend: User not authenticated - thrown by auth middleware */
	GLOBAL_AUTH_UNAUTHENTICATED: 'global:auth:unauthenticated',

	// Upload middleware (file upload endpoints)
	/** Backend: File exceeds size limit - thrown by multipart handler */
	GLOBAL_UPLOAD_FILE_TOO_LARGE: 'global:upload:file-too-large',
	/** Backend: Invalid image format - thrown by image processor */
	GLOBAL_UPLOAD_INVALID_IMAGE: 'global:upload:invalid-image',
	/** Backend: uploaded file MIME type or magic bytes didn't match allowed types */
	GLOBAL_UPLOAD_INVALID_FILE_TYPE: 'global:upload:invalid-file-type',
	/** Backend: multipart request missing Content-Type or not multipart/form-data */
	GLOBAL_UPLOAD_INVALID_CONTENT_TYPE: 'global:upload:invalid-content-type',
	/** Backend: multipart Content-Type missing boundary parameter */
	GLOBAL_UPLOAD_MISSING_BOUNDARY: 'global:upload:missing-boundary',
	/** Backend: no file found in multipart data */
	GLOBAL_UPLOAD_NO_FILE: 'global:upload:no-file',

	// Rate limiting middleware (protects all endpoints)
	/** Backend: Too many requests - thrown by rate limiter */
	GLOBAL_RATELIMIT_EXCEEDED: 'global:ratelimit:exceeded',

	// =========================================================================
	// FRONTEND-ONLY ERRORS - `snake_case`
	// These codes are generated client-side, never from backend
	// Detected by axios error interceptors before/without server response
	// =========================================================================

	// Network errors (axios error.code detection)
	/** Frontend: No network connection - axios ERR_NETWORK */
	NETWORK_ERROR: 'network_error',
	/** Frontend: Request exceeded timeout - axios ECONNABORTED */
	TIMEOUT_ERROR: 'timeout_error',
	/** Frontend: Connection dropped mid-request */
	CONNECTION_ABORTED: 'connection_aborted',

	// HTTP status fallbacks (when backend returns no specific error code)
	/** Frontend: HTTP 500 without specific backend code */
	INTERNAL_SERVER_ERROR: 'internal_server_error',
	/** Frontend: HTTP 503 - service temporarily unavailable */
	SERVICE_UNAVAILABLE: 'service_unavailable',

	// Client error fallbacks
	/** Frontend: HTTP 400 without specific backend code */
	INVALID_REQUEST: 'invalid_request',
	/** Frontend: Request payload validation failed */
	VALIDATION_ERROR: 'validation_error',

	// Auth fallbacks (HTTP status without backend code)
	/** Frontend: HTTP 401 without specific backend code */
	UNAUTHORIZED: 'unauthorized',
	/** Frontend: HTTP 403 without specific backend code */
	FORBIDDEN: 'forbidden',
	/** Frontend: Local session/token expired detection */
	SESSION_EXPIRED: 'session_expired',

	// Final fallback
	/** Frontend: Unhandled/unexpected error - catch-all */
	UNKNOWN_ERROR: 'unknown_error',
} as const;

/**
 * Common error code type
 * Union of all backend `global:*` codes and frontend `snake_case` codes
 */
export type CommonErrorCode =
	(typeof COMMON_ERROR_CODES)[keyof typeof COMMON_ERROR_CODES];
