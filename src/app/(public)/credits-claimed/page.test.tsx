import { describe, expect, test } from 'bun:test';

import { shouldTrackPublicCreditClaim } from './page';

describe('CreditsClaimedPage analytics', () => {
	test('does not track claimed credits while magic-link provisioning is disabled', async () => {
		expect(
			shouldTrackPublicCreditClaim({
				isMagicLinkEnabled: false,
				userId: 'user-1',
			}),
		).toBe(false);
	});

	test('does not track claimed credits without a session', async () => {
		expect(
			shouldTrackPublicCreditClaim({
				isMagicLinkEnabled: true,
				userId: undefined,
			}),
		).toBe(false);
	});

	test('tracks claimed credits only for magic-link success with a session', async () => {
		expect(
			shouldTrackPublicCreditClaim({
				isMagicLinkEnabled: true,
				userId: 'user-1',
			}),
		).toBe(true);
	});
});
