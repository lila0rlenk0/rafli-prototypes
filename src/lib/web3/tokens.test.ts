import { describe, expect, test } from 'bun:test';

import { getSelectableTokensForChain, getTokenBySlugForChain } from './tokens';

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

	test('surfaces EARNM on every backend-supported chain when priced', () => {
		const pricedTokenSlugs = ['earnm'];

		expect(
			getSelectableTokensForChain(1, { pricedTokenSlugs }).map(
				token => token.slug,
			),
		).toEqual(['usdc', 'usdt', 'earnm']);
		expect(
			getSelectableTokensForChain(8453, { pricedTokenSlugs }).map(
				token => token.slug,
			),
		).toEqual(['usdc', 'usdt', 'earnm']);
		expect(
			getSelectableTokensForChain(137, { pricedTokenSlugs }).map(
				token => token.slug,
			),
		).toEqual(['usdc', 'usdt', 'earnm']);
		expect(
			getSelectableTokensForChain(80_002, { pricedTokenSlugs }).map(
				token => token.slug,
			),
		).toEqual(['usdc', 'earnm']);
	});

	test('respects raffle token allowlists after pricing filter', () => {
		const tokens = getSelectableTokensForChain(42_161, {
			allowedTokenSlugs: ['usdt', 'earnm'],
			pricedTokenSlugs: ['earnm'],
		});

		expect(tokens.map(token => token.slug)).toEqual(['usdt', 'earnm']);
	});

	test('keeps Polygon Amoy aligned with backend token registry', () => {
		const tokens = getSelectableTokensForChain(80_002, {
			pricedTokenSlugs: ['earnm'],
		});

		expect(tokens.map(token => token.slug)).toEqual(['usdc', 'earnm']);
	});
});

describe('getTokenBySlugForChain', () => {
	test('resolves supported chain/token pairs', () => {
		expect(getTokenBySlugForChain(42_161, 'earnm')?.label).toBe('EARNM');
		expect(getTokenBySlugForChain(1, 'earnm')?.label).toBe('EARNM');
		expect(getTokenBySlugForChain(137, 'earnm')?.label).toBe('EARNM');
		expect(getTokenBySlugForChain(8453, 'usdc')?.label).toBe('USDC');
	});

	test('returns null for unsupported token on a chain', () => {
		expect(getTokenBySlugForChain(11_155_111, 'earnm')).toBeNull();
	});

	test('returns null for unknown chains', () => {
		expect(getTokenBySlugForChain(999_999, 'usdc')).toBeNull();
	});
});
