import type { ClientErrorCode } from './client-errors';
import type { CommonErrorCode } from './common-errors';

/**
 * The `/users/:id` profile endpoint is owned by the authentication service
 * (not the `core` namespace), so the canonical not-found code comes back as
 * `auth:profile:not-found`. Keep this constant in sync with the backend's
 * `get-user-profile.query.ts` — the `/host/[username]` page branches on
 * `HOST_ERROR_CODES.NOT_FOUND === error` to decide between `notFound()` and
 * the inline "Error loading profile" surface, and a string mismatch here
 * silently routes real 404s into the generic error UI.
 */
export const HOST_ERROR_CODES = {
	/** Host profile not found — `auth:profile:not-found` on the wire. */
	NOT_FOUND: 'auth:profile:not-found',
	/** Failed to fetch host data */
	FETCH_FAILED: 'fetch_failed',
} as const;

export type HostErrorCode =
	| (typeof HOST_ERROR_CODES)[keyof typeof HOST_ERROR_CODES]
	| ClientErrorCode
	| CommonErrorCode;
