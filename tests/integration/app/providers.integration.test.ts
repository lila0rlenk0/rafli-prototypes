import { describe, expect, mock, test } from 'bun:test';

const mockCookies = mock();

mock.module('next/headers', () => ({
	cookies: mockCookies,
}));

mock.module('@/lib/web3/constants', () => ({
	WAGMI_COOKIE_KEY: 'wagmi.store',
}));

const mockProvidersClient = mock((props: unknown) => props);

mock.module('@/app/providers-client', () => ({
	ProvidersClient: mockProvidersClient,
}));

const { Providers } = await import('@/app/providers');

describe('Providers', () => {
	test('forwards only the wagmi cookie value into client props', async () => {
		mockCookies.mockReset();
		mockProvidersClient.mockReset();

		const get = mock((name: string) =>
			name === 'wagmi.store' ? { value: 'wagmi-state' } : null,
		);
		const toString = mock(() => 'auth=secret; wagmi.store=wagmi-state');
		mockCookies.mockResolvedValueOnce({ get, toString });

		const element = await Providers({ children: 'child' });

		expect(get).toHaveBeenCalledTimes(1);
		expect(get).toHaveBeenCalledWith('wagmi.store');
		expect(toString).not.toHaveBeenCalled();
		expect(element.props).toEqual({
			children: 'child',
			wagmiCookieValue: 'wagmi-state',
		});
	});

	test('passes null when the wagmi cookie is absent', async () => {
		mockCookies.mockReset();
		mockProvidersClient.mockReset();

		const get = mock(() => null);
		mockCookies.mockResolvedValueOnce({ get });

		const element = await Providers({ children: 'child' });

		expect(get).toHaveBeenCalledWith('wagmi.store');
		expect(element.props).toEqual({
			children: 'child',
			wagmiCookieValue: null,
		});
	});
});
