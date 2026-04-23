import { describe, expect, test } from 'bun:test';

import type { Permission } from '@/types/user-mode';

import {
	hasHostPermission,
	parsePermissions,
	PERMISSIONS,
} from './permissions';

describe('parsePermissions', () => {
	test('returns empty array for undefined input', () => {
		expect(parsePermissions(undefined)).toEqual([]);
	});

	test('returns empty array for empty array', () => {
		expect(parsePermissions([])).toEqual([]);
	});

	test('keeps recognized permissions', () => {
		const result = parsePermissions(['raffle:create', 'raffle:participate']);
		expect(result).toEqual(['raffle:create', 'raffle:participate']);
	});

	test('discards unknown permission strings from future backend versions', () => {
		const result = parsePermissions([
			'raffle:create',
			'billing:manage',
			'raffle:participate',
		]);
		expect(result).toEqual(['raffle:create', 'raffle:participate']);
	});

	test('discards all entries when none are recognized', () => {
		expect(parsePermissions(['unknown:perm', 'also:unknown'])).toEqual([]);
	});

	test('includes admin:kyc:review when present', () => {
		const result = parsePermissions(['raffle:create', PERMISSIONS.KYC_REVIEW]);
		expect(result).toContain('admin:kyc:review');
	});

	test('preserves order of input permissions', () => {
		const input: Permission[] = [
			'raffle:participate',
			'raffle:create',
			'raffle:manage',
		];
		expect(parsePermissions(input)).toEqual(input);
	});
});

describe('hasHostPermission', () => {
	test('returns true when raffle:create is present', () => {
		expect(hasHostPermission(['raffle:create', 'raffle:participate'])).toBe(
			true,
		);
	});

	test('returns false when raffle:create is absent', () => {
		expect(hasHostPermission(['raffle:participate'])).toBe(false);
	});

	test('returns false for empty permissions', () => {
		expect(hasHostPermission([])).toBe(false);
	});
});

describe('PERMISSIONS constants', () => {
	describe('value correctness', () => {
		test('KYC_REVIEW matches expected string', () => {
			expect(PERMISSIONS.KYC_REVIEW).toBe('admin:kyc:review');
		});
	});
});
