import { mock } from 'bun:test';

/**
 * Bun has no per-file test env. Specs that import `proceedToStripeCheckout` (→ `env/server`)
 * or any client of `clientEnv` must see defined vars or the module graph fails mid-link and
 * leaves downstream imports in TDZ (e.g. `map*Error` in `error-mapper`). CI uses `skipValidation`.
 */
function ensureTestProcessEnv(): void {
	if (process.env.CI === 'true') return;
	if (process.env.BACKEND_URL === undefined) {
		process.env.BACKEND_URL = 'http://localhost:4000';
	}
	if (process.env.APP_URL === undefined) {
		process.env.APP_URL = 'http://localhost:3000';
	}
	if (process.env.S2S_SECRET === undefined) {
		process.env.S2S_SECRET = 'x'.repeat(32);
	}
	if (process.env.MIXPANEL_TOKEN === undefined) {
		process.env.MIXPANEL_TOKEN = 'test-mixpanel-server-token';
	}
	if (process.env.NEXT_PUBLIC_MIXPANEL_TOKEN === undefined) {
		process.env.NEXT_PUBLIC_MIXPANEL_TOKEN = 'test-mixpanel-client-token';
	}
	if (process.env.NEXT_PUBLIC_VRF_HANDLER_ADDRESS === undefined) {
		process.env.NEXT_PUBLIC_VRF_HANDLER_ADDRESS =
			'0x0000000000000000000000000000000000000001';
	}
	if (process.env.NEXT_PUBLIC_VRF_COORDINATOR_ADDRESS === undefined) {
		process.env.NEXT_PUBLIC_VRF_COORDINATOR_ADDRESS =
			'0x0000000000000000000000000000000000000002';
	}
}

ensureTestProcessEnv();

import { meResponseSchema, type MeResponse } from '@/types/user';

// Neutralise the `server-only` package under Bun's test runner. The real
// module throws at import time unless the caller is an RSC, which every
// `@/lib/api/*` module is — but tests import those modules directly to
// exercise their happy paths. Replacing the module with an empty export
// keeps the import side-effect-free without weakening the production
// guard (Next.js still enforces it during build).
mock.module('server-only', () => ({}));

import type { AuthUser } from '@/types/auth';

const DEFAULT_INTEGRATION_ME: MeResponse = {
	id: 'integration-test-user',
	email: 'integration@test.local',
	emailVerified: true,
	name: 'Integration',
	username: null,
	image: null,
	bio: null,
	// Default to `true` so integration tests that aren't exercising the
	// set-password branch land on the change-password code path (matches
	// the production majority — most users sign up with a password).
	hasPassword: true,
	createdAt: '2020-01-01T00:00:00.000Z',
	updatedAt: '2020-01-01T00:00:00.000Z',
	permissions: [],
};

meResponseSchema.parse(DEFAULT_INTEGRATION_ME);

function meResponseToAuthUser(me: MeResponse): AuthUser {
	return {
		id: me.id,
		email: me.email,
		emailVerified: me.emailVerified,
		name: me.name,
		image: me.image ?? undefined,
		permissions: me.permissions,
	};
}

/**
 * Source `fetchMeWithBearerToken` does `await import('@/lib/api/client')` per
 * call, so the latest `mock.module('@/lib/api/client', …)` in a test wins.
 * `session` loads `fetch-me-with-bearer` via dynamic `import()` inside
 * `setAuthCookies` / `getSession`, so overrides of this module apply at call
 * time (not stuck on the preload binding). This stub remains the
 * process-default for tests that never replace `fetch-me-with-bearer`.
 *
 * Returns the tri-state outcome shape — tests that want to simulate
 * "token rejected" or "backend transient failure" must return
 * `{ kind: 'unauthorized' }` / `{ kind: 'transient' }` respectively
 * (see `verify-bearer-cookies.integration.test.ts`).
 */
mock.module('@/lib/auth/fetch-me-with-bearer', () => ({
	meResponseToAuthUser,
	/** Synchronous "valid /me" for most integration tests (no I/O) */
	fetchMeWithBearerToken: async () => ({
		kind: 'ok',
		me: DEFAULT_INTEGRATION_ME,
	}),
}));
