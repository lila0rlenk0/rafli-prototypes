import type { ClientErrorCode } from './client-errors';
import type { CommonErrorCode } from './common-errors';

/**
 * Host Error Codes
 *
 * Error codes for host profile operations.
 * Uses "core:user:" prefix to align with backend conventions.
 */

/**
 * Host error codes constant object
 */
export const HOST_ERROR_CODES = {
	/** Host profile not found */
	NOT_FOUND: 'core:user:not-found',
	/** Failed to fetch host data */
	FETCH_FAILED: 'fetch_failed',
} as const;

/**
 * Host error code type
 * Represents all possible host-specific, client-side, and common error codes
 */
export type HostErrorCode =
	| (typeof HOST_ERROR_CODES)[keyof typeof HOST_ERROR_CODES]
	| ClientErrorCode
	| CommonErrorCode;
