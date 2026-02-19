import { describe, expect, test } from 'bun:test';

import { buildOAuthCallbackUrl } from './build-oauth-callback-url';

describe('buildOAuthCallbackUrl', () => {
	test('preserves returnTo via query param encoding', () => {
		const url = buildOAuthCallbackUrl(
			'https://app.example.com',
			'/browse/my-raffle?tab=details',
		);

		expect(url).toBe(
			'https://app.example.com/auth/callback?returnTo=%2Fbrowse%2Fmy-raffle%3Ftab%3Ddetails',
		);
	});
});
