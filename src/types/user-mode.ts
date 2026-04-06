import { z } from 'zod';

// ─── Constants ──────────────────────────────────────────────────────────────

export const USER_MODE = {
	PARTICIPANT: 'participant',
	HOST: 'host',
} as const;

// ─── Types from Constants ───────────────────────────────────────────────────

/**
 * Represents the user's current mode (participant browsing or host managing)
 */
export type UserMode = (typeof USER_MODE)[keyof typeof USER_MODE];

// ─── Schemas ────────────────────────────────────────────────────────────────

/** Schema for validating user mode strings */
export const userModeSchema = z.enum([USER_MODE.PARTICIPANT, USER_MODE.HOST]);

/** Schema for backend permission strings — used by parsePermissions() */
export const permissionSchema = z.enum([
	'raffle:create',
	'raffle:manage',
	'raffle:participate',
	'admin:kyc:review',
]);

// ─── Inferred Types ─────────────────────────────────────────────────────────

/**
 * Permission type — derived from permissionSchema to prevent drift
 * between the Zod enum and the TypeScript type
 */
export type Permission = z.infer<typeof permissionSchema>;
