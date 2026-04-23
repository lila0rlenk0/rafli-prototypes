import { beforeEach, describe, expect, mock, test } from 'bun:test';

import type { MeResponse } from '@/types/user';

/** Minimal fake JWT (header.payload.sig) — validateJwtStructure passes; backend may still reject */
function encodeFakeJwt(payload: Record<string, unknown>): string {
	const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
	const body = btoa(JSON.stringify(payload));
	return `${header}.${body}.sig`;
}

const VALID_PAYLOAD = {
	sub: 'user-1',
	email: 'test@example.com',
	emailVerified: true,
	name: 'Test',
	exp: Math.floor(Date.now() / 1000) + 3_600,
	iat: Math.floor(Date.now() / 1000),
};

const ME_OK = {
	id: 'user-1',
	email: 'test@example.com',
	emailVerified: true,
	name: 'Test',
	username: null,
	image: null,
	bio: null,
	createdAt: '2020-01-01T00:00:00.000Z',
	updatedAt: '2020-01-01T00:00:00.000Z',
	permissions: [] as string[],
};

const mockGet = mock(
	async (_url: string, _config?: { headers?: Record<string, string> }) => ({
		data: ME_OK,
	}),
);
const mockSet = mock();

mock.module('@/lib/api/client', () => ({
	baseClient: {
		get: (url: string, config?: { headers?: Record<string, string> }) =>
			mockGet(url, config),
		post: mock(async () => ({ data: {} })),
		delete: mock(async () => ({ data: {} })),
	},
	authenticatedClient: {
		get: (url: string, config?: { headers?: Record<string, string> }) =>
			mockGet(url, config),
		post: mock(async () => ({ data: {} })),
		delete: mock(async () => ({ data: {} })),
	},
}));

// Override preload's stub: exercise real `GET /me` via the mocked `baseClient`
// (must run before the first `import('@/lib/auth/session')` in this file).
// Classification mirrors the source: backend `401` → `unauthorized`, anything
// else → `transient`. Tests assert both branches explicitly.
mock.module('@/lib/auth/fetch-me-with-bearer', () => ({
	meResponseToAuthUser: (me: MeResponse) => ({
		id: me.id,
		email: me.email,
		emailVerified: me.emailVerified,
		name: me.name,
		image: me.image ?? undefined,
		permissions: me.permissions,
	}),
	fetchMeWithBearerToken: async (token: string) => {
		const { meResponseSchema: schema } = await import('@/types/user');
		const { baseClient } = await import('@/lib/api/client');
		const { AxiosError: Ax } = await import('axios');
		try {
			const response = await baseClient.get('/me', {
				headers: { Authorization: `Bearer ${token}` },
			});
			return { kind: 'ok', me: schema.parse(response.data) };
		} catch (error) {
			if (error instanceof Ax && error.response?.status === 401) {
				return { kind: 'unauthorized' };
			}
			return { kind: 'transient' };
		}
	},
}));

const mockCookieGet = mock((_name: string) => undefined as
	| { value: string }
	| undefined);
const mockCookieDelete = mock((_name: string) => {});

mock.module('next/headers', () => ({
	cookies: mock(async () => ({
		set: mockSet,
		get: mockCookieGet,
		delete: mockCookieDelete,
	})),
}));

mock.module('@/lib/auth/constants', () => ({
	AUTH_COOKIES: { TOKEN: 'raffly-token', SESSION: 'raffly-session' },
	COOKIE_OPTIONS: {
		httpOnly: true,
		secure: false,
		sameSite: 'lax' as const,
		maxAge: 60 * 60 * 24 * 30,
		path: '/',
	},
}));

mock.module('@/lib/mode/cookies', () => ({
	clearUserModeCookie: mock(async () => {}),
	getUserModeCookie: mock(async () => null),
	setUserModeCookie: mock(async () => {}),
}));

mock.module('@/lib/sentry/user', () => ({
	clearSentryUser: mock(),
	setSentryUser: mock(),
	setSentryUserMode: mock(),
}));

// Load `client-session` first — it no longer static-imports `session`, so
// this file's `fetch-me` mock (above) is still the one that binds when
// `import('@/lib/auth/session')` runs.
const { setAuthCookiesClient } = await import('@/lib/auth/client-session');
const { setAuthCookies, getSession } = await import('@/lib/auth/session');

const token = encodeFakeJwt(VALID_PAYLOAD);

/** Builds an AxiosError with a synthetic response for tests that need a real 401 */
async function buildAxios401(): Promise<Error> {
	const { AxiosError } = await import('axios');
	const err = new AxiosError('Unauthorized');
	err.response = {
		data: {},
		status: 401,
		statusText: 'Unauthorized',
		headers: {},
		config: {} as never,
	};
	return err;
}

describe('setAuthCookies / GET /me round-trip (forged-JWT / unsigned claims mitigated)', () => {
	beforeEach(() => {
		mockGet.mockReset();
		mockSet.mockReset();
		mockCookieGet.mockReset();
		mockCookieDelete.mockReset();
	});

	test('throws when GET /me fails — no httpOnly session write', async () => {
		mockGet.mockRejectedValueOnce(new Error('401'));

		await expect(setAuthCookies(token)).rejects.toThrow();

		expect(mockSet).not.toHaveBeenCalled();
	});

	test('writes cookies when GET /me returns 200 with trusted user', async () => {
		mockGet.mockResolvedValueOnce({ data: ME_OK });

		await setAuthCookies(token);

		expect(mockSet).toHaveBeenCalled();
	});

	test('setAuthCookiesClient returns false when backend rejects token', async () => {
		mockGet.mockRejectedValueOnce(new Error('unauthorized'));

		const result = await setAuthCookiesClient(token);

		expect(result.success).toBe(false);
	});
});

describe('getSession — transient /me failure must not evict cookies (UX: no forced logout on backend blip)', () => {
	beforeEach(() => {
		mockGet.mockReset();
		mockSet.mockReset();
		mockCookieGet.mockReset();
		mockCookieDelete.mockReset();
		// Simulate a logged-in user: token cookie present, session irrelevant
		mockCookieGet.mockImplementation((name: string) =>
			name === 'raffly-token' ? { value: token } : undefined,
		);
	});

	test('5xx / network / timeout → returns null, cookies preserved', async () => {
		// Plain Error mimics network/timeout — no AxiosError `.response.status`
		// so the classifier resolves to `transient`. The user keeps their
		// cookies and a later refresh restores the session.
		mockGet.mockRejectedValueOnce(new Error('ECONNRESET'));

		const session = await getSession();

		expect(session).toBeNull();
		expect(mockCookieDelete).not.toHaveBeenCalled();
	});

	test('schema drift (2xx with malformed body) → transient, cookies preserved', async () => {
		// Backend deploys a broken /me that still returns 200 — zod parse
		// throws, which we classify as `transient` rather than evicting.
		// Cast: we intentionally send a body that violates the /me schema.
		mockGet.mockResolvedValueOnce({
			data: { totally: 'malformed' } as unknown as typeof ME_OK,
		});

		const session = await getSession();

		expect(session).toBeNull();
		expect(mockCookieDelete).not.toHaveBeenCalled();
	});

	test('real 401 from backend → cookies evicted (token actually rejected)', async () => {
		// Only a real `401` should destroy the session — this is the
		// positive-case that proves transient classification is not too loose.
		mockGet.mockRejectedValueOnce(await buildAxios401());

		const session = await getSession();

		expect(session).toBeNull();
		expect(mockCookieDelete).toHaveBeenCalled();
	});
});
