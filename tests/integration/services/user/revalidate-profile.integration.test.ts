import { describe, expect, mock, test } from 'bun:test';

// --- Mocks ---

const mockRevalidatePath = mock();

// All next/cache exports required — incomplete mocks contaminate other test files via Bun's global mock.module()
mock.module('next/cache', () => ({
	cacheLife: mock(),
	cacheTag: mock(),
	unstable_cacheLife: mock(),
	unstable_cacheTag: mock(),
	revalidatePath: mockRevalidatePath,
	revalidateTag: mock(),
}));

// Import AFTER mocking
const { revalidateProfile } = await import(
	'@/services/user/revalidate-profile'
);

describe('revalidateProfile', () => {
	test('calls revalidatePath with /profile', async () => {
		mockRevalidatePath.mockReset();

		await revalidateProfile();

		expect(mockRevalidatePath).toHaveBeenCalledWith('/profile', 'page');
	});

	test('resolves without error', async () => {
		mockRevalidatePath.mockReset();

		// Should not throw
		await expect(revalidateProfile()).resolves.toBeUndefined();
	});
});
