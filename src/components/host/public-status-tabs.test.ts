import { describe, expect, test } from 'bun:test';

import { getPublicStatusState } from './public-status-tabs';

describe('getPublicStatusState', () => {
	test('treats missing status as active', () => {
		expect(getPublicStatusState(null)).toEqual({
			isActive: true,
			isEnded: false,
		});
	});

	test('treats invalid status as active fallback', () => {
		expect(getPublicStatusState('unexpected-value')).toEqual({
			isActive: true,
			isEnded: false,
		});
	});

	test('selects ended tab for ended status', () => {
		expect(getPublicStatusState('ended')).toEqual({
			isActive: false,
			isEnded: true,
		});
	});
});
