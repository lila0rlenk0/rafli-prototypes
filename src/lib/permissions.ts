import { permissionSchema, type Permission } from '@/types/user-mode';

/**
 * Permission constants for authorization checks
 * These match the permissions array in JWT payload
 */
export const PERMISSIONS = {
	RAFFLE_CREATE: 'raffle:create',
	RAFFLE_MANAGE: 'raffle:manage',
	RAFFLE_PARTICIPATE: 'raffle:participate',
	KYC_REVIEW: 'admin:kyc:review',
} as const;

/**
 * Check if user has host base permissions in order to access host features
 * @param permissions - Array of permissions
 * @returns True if user has raffle:create permission
 */
export function hasHostPermission(permissions: string[]): boolean {
	return permissions.includes(PERMISSIONS.RAFFLE_CREATE);
}

/**
 * Validates and filters raw permission strings from JWT payload.
 * Only includes values recognized by the Permission schema — unknown
 * strings from future backend versions are silently discarded.
 *
 * @param rawPermissions - Unvalidated string array from JWT
 * @returns Array of valid Permission values
 */
export function parsePermissions(
	rawPermissions: string[] | undefined,
): Permission[] {
	if (!rawPermissions) return [];
	return rawPermissions.filter(
		(p): p is Permission => permissionSchema.safeParse(p).success,
	);
}
