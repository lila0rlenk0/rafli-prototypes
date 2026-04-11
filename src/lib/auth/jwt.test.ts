import { describe, expect, test } from 'bun:test';

import type { JwtPayload } from './jwt';
import {
	decodeJwt,
	isJwtExpired,
	jwtPayloadToUser,
	validateJwtStructure,
} from './jwt';

/** Removes keys from an object — avoids unused-var lint errors from destructuring. */
function omit<T extends Record<string, unknown>, K extends keyof T>(
	obj: T,
	...keys: K[]
): Omit<T, K> {
	const copy = { ...obj };
	for (const k of keys) delete copy[k];
	return copy;
}

// Valid JWT payload fields shared across test fixtures
const BASE_PAYLOAD: JwtPayload = {
	sub: 'user-123',
	email: 'test@example.com',
	emailVerified: true,
	name: 'Test User',
	permissions: ['raffle:create'],
	exp: Math.floor(Date.now() / 1000) + 3_600, // 1 hour from now
	iat: Math.floor(Date.now() / 1000),
};

/**
 * Encodes a payload into a fake JWT (header.payload.signature).
 * Signature segment is a dummy — decodeJwt only reads the payload.
 */
function encodeFakeJwt(payload: Record<string, unknown>): string {
	const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
	const body = btoa(JSON.stringify(payload));
	return `${header}.${body}.fake-signature`;
}

describe('decodeJwt', () => {
	describe('valid tokens', () => {
		test('decodes payload with sub claim', () => {
			const token = encodeFakeJwt(BASE_PAYLOAD);
			const result = decodeJwt(token);
			expect(result.sub).toBe('user-123');
			expect(result.email).toBe('test@example.com');
			expect(result.name).toBe('Test User');
			expect(result.emailVerified).toBe(true);
		});

		test('decodes payload with id claim instead of sub', () => {
			const token = encodeFakeJwt({
				...omit(BASE_PAYLOAD, 'sub'),
				id: 'user-456',
			});
			const result = decodeJwt(token);
			expect(result.id).toBe('user-456');
			expect(result.sub).toBeUndefined();
		});

		test('decodes payload with both sub and id', () => {
			const token = encodeFakeJwt({ ...BASE_PAYLOAD, id: 'alt-id' });
			const result = decodeJwt(token);
			expect(result.sub).toBe('user-123');
			expect(result.id).toBe('alt-id');
		});

		test('handles missing permissions field', () => {
			const token = encodeFakeJwt(omit(BASE_PAYLOAD, 'permissions'));
			const result = decodeJwt(token);
			expect(result.permissions).toBeUndefined();
		});
	});

	describe('invalid tokens', () => {
		test('throws on empty string', () => {
			expect(() => decodeJwt('')).toThrow('Failed to decode JWT');
		});

		test('throws on token with no dots', () => {
			expect(() => decodeJwt('nodots')).toThrow('Failed to decode JWT');
		});

		test('throws on token with only header (one dot)', () => {
			expect(() => decodeJwt('header.')).toThrow('Failed to decode JWT');
		});

		test('throws on invalid base64 payload', () => {
			expect(() => decodeJwt('header.!!!invalid.sig')).toThrow(
				'Failed to decode JWT',
			);
		});

		test('throws when payload missing required fields', () => {
			// Missing email, name, exp, iat
			const token = encodeFakeJwt({ sub: 'user-1' });
			expect(() => decodeJwt(token)).toThrow('Failed to decode JWT');
		});

		test('throws when neither sub nor id present', () => {
			const token = encodeFakeJwt(omit(BASE_PAYLOAD, 'sub'));
			expect(() => decodeJwt(token)).toThrow('Failed to decode JWT');
		});
	});
});

describe('isJwtExpired', () => {
	describe('expiry detection', () => {
		test('returns false for token expiring in the future', () => {
			const token = encodeFakeJwt(BASE_PAYLOAD);
			expect(isJwtExpired(token)).toBe(false);
		});

		test('returns true for token expired well in the past', () => {
			const expiredPayload = {
				...BASE_PAYLOAD,
				// 2 hours ago — well past the 60s clock-skew tolerance
				exp: Math.floor(Date.now() / 1000) - 7_200,
			};
			const token = encodeFakeJwt(expiredPayload);
			expect(isJwtExpired(token)).toBe(true);
		});

		test('returns false for token within 60s clock-skew tolerance', () => {
			// Token exp is 30s ago — within the 60s tolerance window
			const payload = {
				...BASE_PAYLOAD,
				exp: Math.floor(Date.now() / 1000) - 30,
			};
			const token = encodeFakeJwt(payload);
			expect(isJwtExpired(token)).toBe(false);
		});

		test('returns true for token expired beyond clock-skew tolerance', () => {
			// Token exp is 120s ago — beyond the 60s tolerance
			const payload = {
				...BASE_PAYLOAD,
				exp: Math.floor(Date.now() / 1000) - 120,
			};
			const token = encodeFakeJwt(payload);
			expect(isJwtExpired(token)).toBe(true);
		});
	});

	describe('malformed tokens', () => {
		test('returns true for malformed token', () => {
			expect(isJwtExpired('not-a-jwt')).toBe(true);
		});

		test('returns true for empty string', () => {
			expect(isJwtExpired('')).toBe(true);
		});
	});
});

describe('jwtPayloadToUser', () => {
	test('converts payload with sub to AuthUser', () => {
		const user = jwtPayloadToUser(BASE_PAYLOAD);
		expect(user).toEqual({
			id: 'user-123',
			email: 'test@example.com',
			emailVerified: true,
			name: 'Test User',
			image: null,
			permissions: ['raffle:create'],
		});
	});

	test('uses id when sub is absent', () => {
		// Cast: refinement guarantees id exists — test builds payload manually
		const payload = {
			...omit(BASE_PAYLOAD, 'sub'),
			id: 'user-456',
		} as JwtPayload;
		const user = jwtPayloadToUser(payload);
		expect(user.id).toBe('user-456');
	});

	test('prefers sub over id', () => {
		const payload = { ...BASE_PAYLOAD, id: 'alt-id' };
		const user = jwtPayloadToUser(payload);
		expect(user.id).toBe('user-123');
	});

	test('sets image to null', () => {
		const user = jwtPayloadToUser(BASE_PAYLOAD);
		expect(user.image).toBeNull();
	});

	test('passes through undefined permissions', () => {
		// Cast: refinement guarantees sub exists — test builds payload manually
		const payload = omit(BASE_PAYLOAD, 'permissions') as JwtPayload;
		const user = jwtPayloadToUser(payload);
		expect(user.permissions).toBeUndefined();
	});
});

describe('validateJwtStructure', () => {
	describe('valid tokens', () => {
		test('accepts well-formed token with valid exp', () => {
			const token = encodeFakeJwt(BASE_PAYLOAD);
			expect(() => validateJwtStructure(token)).not.toThrow();
		});

		test('accepts token expiring at the 31-day boundary', () => {
			const payload = {
				...BASE_PAYLOAD,
				exp: Math.floor(Date.now() / 1_000) + 31 * 24 * 60 * 60 - 120,
			};
			const token = encodeFakeJwt(payload);
			expect(() => validateJwtStructure(token)).not.toThrow();
		});
	});

	describe('structural validation', () => {
		test('rejects token with fewer than 3 segments', () => {
			expect(() => validateJwtStructure('header.payload')).toThrow(
				'expected 3 segments',
			);
		});

		test('rejects token with more than 3 segments', () => {
			expect(() => validateJwtStructure('a.b.c.d')).toThrow(
				'expected 3 segments',
			);
		});

		test('rejects token with empty signature segment', () => {
			const header = btoa(JSON.stringify({ alg: 'none' }));
			const body = btoa(JSON.stringify(BASE_PAYLOAD));
			expect(() => validateJwtStructure(`${header}.${body}.`)).toThrow(
				'missing signature segment',
			);
		});
	});

	describe('expiration bounds', () => {
		test('rejects expired token (past clock-skew tolerance)', () => {
			const payload = {
				...BASE_PAYLOAD,
				exp: Math.floor(Date.now() / 1_000) - 120,
			};
			const token = encodeFakeJwt(payload);
			expect(() => validateJwtStructure(token)).toThrow('token is expired');
		});

		test('rejects token with exp >31 days in the future', () => {
			const payload = {
				...BASE_PAYLOAD,
				exp: Math.floor(Date.now() / 1_000) + 32 * 24 * 60 * 60,
			};
			const token = encodeFakeJwt(payload);
			expect(() => validateJwtStructure(token)).toThrow(
				'expiration too far in the future',
			);
		});
	});

	describe('claim validation', () => {
		test('rejects token with empty sub and no id', () => {
			const payload = { ...BASE_PAYLOAD, sub: '' };
			const token = encodeFakeJwt(omit(payload, 'sub'));
			// decodeJwt throws because neither sub nor id is present
			expect(() => validateJwtStructure(token)).toThrow();
		});

		test('rejects token with whitespace-only email', () => {
			const payload = { ...BASE_PAYLOAD, email: '   ' };
			const token = encodeFakeJwt(payload);
			expect(() => validateJwtStructure(token)).toThrow('missing email claim');
		});
	});
});
