import { beforeEach, describe, expect, mock, test } from 'bun:test';

const mockRevalidatePath = mock();
const mockRevalidateTag = mock();

// Full export surface — other specs import `cacheLife` / `cacheTag` from `next/cache`; a
// partial `mock.module` poisons the global and breaks `get-raffle-cover` and similar.
mock.module('next/cache', () => ({
	revalidatePath: mockRevalidatePath,
	revalidateTag: mockRevalidateTag,
	refresh: mock(),
	updateTag: mock(),
	unstable_cache: mock(),
	unstable_noStore: mock(),
	cacheLife: mock(),
	cacheTag: mock(),
	unstable_cacheLife: mock(),
	unstable_cacheTag: mock(),
}));

const { revalidateMyRaffles, revalidateRaffleDetail, revalidateWinningPaths } =
	await import('./revalidation');

describe('revalidatePath (explicit page type for cache invalidation)', () => {
	beforeEach(() => {
		mockRevalidatePath.mockReset();
		mockRevalidateTag.mockReset();
	});

	test('revalidateMyRaffles passes page as second argument', () => {
		revalidateMyRaffles();
		expect(mockRevalidatePath).toHaveBeenCalledWith('/my-raffles', 'page');
	});

	test('revalidateRaffleDetail only revalidates tag', () => {
		revalidateRaffleDetail('rid');
		expect(mockRevalidatePath).not.toHaveBeenCalled();
		expect(mockRevalidateTag).toHaveBeenCalled();
	});

	test('revalidateRaffleDetail also clears slug-tag when slug provided', () => {
		// `getRaffle` tags cached entries with both id and slug; a mutation that
		// knows the slug must clear both so the next read repopulates fresh.
		revalidateRaffleDetail('rid', 'my-slug');
		expect(mockRevalidateTag).toHaveBeenCalledWith('raffle-detail-rid', 'max');
		expect(mockRevalidateTag).toHaveBeenCalledWith(
			'raffle-detail-my-slug',
			'max',
		);
	});

	test('revalidateWinningPaths passes page for each path', () => {
		revalidateWinningPaths('my-slug');
		expect(mockRevalidatePath).toHaveBeenCalledWith('/my-raffles', 'page');
		expect(mockRevalidatePath).toHaveBeenCalledWith('/browse/my-slug', 'page');
		expect(mockRevalidatePath).toHaveBeenCalledWith(
			'/browse/my-slug/fulfillment',
			'page',
		);
	});
});
