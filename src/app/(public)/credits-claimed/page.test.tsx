import { describe, expect, test } from 'bun:test';

import { shouldTrackPublicCreditClaim } from './page';

describe('CreditsClaimedPage analytics', () => {
	test('does not track claimed credits without a session', async () => {
		expect(
			shouldTrackPublicCreditClaim({
				userId: undefined,
			}),
		).toBe(false);
	});

	test('tracks claimed credits when a session resolves', async () => {
		expect(
			shouldTrackPublicCreditClaim({
				userId: 'user-1',
			}),
		).toBe(true);
	});
});
