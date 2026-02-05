import { z } from 'zod';

// ==========================================
// Constants
// ==========================================

export const USER_MODE = {
	PARTICIPANT: 'participant',
	HOST: 'host',
} as const;

// ==========================================
// Types
// ==========================================

/**
 * Represents the user's current mode
 */
export type UserMode = (typeof USER_MODE)[keyof typeof USER_MODE];

/**
 * Permission type matching backend schema
 */
export type Permission =
	| 'raffle:create'
	| 'raffle:manage'
	| 'raffle:participate';

// ==========================================
// Schemas
// ==========================================

export const userModeSchema = z.enum([USER_MODE.PARTICIPANT, USER_MODE.HOST]);

export const permissionSchema = z.enum([
	'raffle:create',
	'raffle:manage',
	'raffle:participate',
]);
