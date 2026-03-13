import { describe, expect, test } from 'bun:test';

import { getSelectableTokensForChain } from './tokens';

describe('getSelectableTokensForChain', () => {
	test('hides non-stablecoins when raffle has no pricing for them', () => {
		const tokens = getSelectableTokensForChain(42_161);

		expect(tokens.map(token => token.slug)).toEqual(['usdc', 'usdt']);
	});

	test('keeps priced non-stablecoins available', () => {
		const tokens = getSelectableTokensForChain(42_161, {
			pricedTokenSlugs: ['earnm'],
		});

		expect(tokens.map(token => token.slug)).toEqual(['usdc', 'usdt', 'earnm']);
	});

	test('respects raffle token allowlists after pricing filter', () => {
		const tokens = getSelectableTokensForChain(42_161, {
			allowedTokenSlugs: ['usdt', 'earnm'],
			pricedTokenSlugs: ['earnm'],
		});

		expect(tokens.map(token => token.slug)).toEqual(['usdt', 'earnm']);
	});

	test('keeps Polygon Amoy aligned with backend token registry', () => {
		const tokens = getSelectableTokensForChain(80_002);

		expect(tokens.map(token => token.slug)).toEqual(['usdc']);
	});
});
