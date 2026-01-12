/**
 * Permission constants for authorization checks
 * These match the permissions array in JWT payload
 */
export const PERMISSIONS = {
	RAFFLE_CREATE: 'raffle:create',
	RAFFLE_MANAGE: 'raffle:manage',
	RAFFLE_PARTICIPATE: 'raffle:participate',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Check if user has host base permissions in order to access host features
 * @param permissions - Array of permissions
 * @returns True if user has raffle:create permission
 */
export function hasHostPermission(permissions: string[]) {
	return permissions.includes(PERMISSIONS.RAFFLE_CREATE);
}
