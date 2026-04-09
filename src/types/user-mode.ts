import { z } from 'zod';

export const USER_MODE = {
	PARTICIPANT: 'participant',
	HOST: 'host',
} as const;

/** User's current mode — participant browsing or host managing */
export type UserMode = (typeof USER_MODE)[keyof typeof USER_MODE];

/**
 * Validation boundary: client-side — validated when reading/writing
 * the `raffly-user-mode` cookie. Also used for route guard checks.
 */
export const userModeSchema = z.enum([USER_MODE.PARTICIPANT, USER_MODE.HOST]);

/**
 * Backend permission strings — used by parsePermissions().
 *
 * Validation boundary: server-side — validated when parsing the
 * permissions array from the session cookie.
 */
export const permissionSchema = z.enum([
	'raffle:create',
	'raffle:manage',
	'raffle:participate',
	'admin:kyc:review',
]);

/**
 * Permission type — derived from permissionSchema to prevent drift
 * between the Zod enum and the TypeScript type
 */
export type Permission = z.infer<typeof permissionSchema>;
