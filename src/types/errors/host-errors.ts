import type { ClientErrorCode } from './client-errors';
import type { CommonErrorCode } from './common-errors';

/** Uses "core:user:" prefix to align with backend conventions */
export const HOST_ERROR_CODES = {
	/** Host profile not found */
	NOT_FOUND: 'core:user:not-found',
	/** Failed to fetch host data */
	FETCH_FAILED: 'fetch_failed',
} as const;

export type HostErrorCode =
	| (typeof HOST_ERROR_CODES)[keyof typeof HOST_ERROR_CODES]
	| ClientErrorCode
	| CommonErrorCode;
