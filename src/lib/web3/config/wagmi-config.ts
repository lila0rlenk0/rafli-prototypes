import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { cookieStorage, createStorage } from 'wagmi';

import { clientEnv } from '@/env/client';
import { configuredNetworks } from '@/lib/web3/config/constants';

/**
 * Reown AppKit project ID — required by the AppKit modal for wallet discovery
 * and WalletConnect relay. When unset, `wagmiAdapter` stays `null` and Web3
 * features degrade gracefully (provider renders as a passthrough).
 */
export const projectId = clientEnv.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

/**
 * wagmi adapter for Reown AppKit.
 *
 * `cookieStorage` persists wagmi state (connected account, chain ID, active
 * connector) as a cookie the server can read on the next request. Paired with
 * `ssr: true` and `cookieToInitialState` in the provider tree, this seeds
 * `WagmiProvider` so the first paint after a reload shows the wallet as
 * connected instead of flashing disconnected between SSR and hydration.
 *
 * `null` when `projectId` is unset — consumers must handle the no-wallet case.
 */
export const wagmiAdapter = projectId
	? new WagmiAdapter({
			projectId,
			networks: configuredNetworks,
			ssr: true,
			// Generic widens the returned `Storage` item map from the default
			// `StorageItemMap` to `StorageItemMap & Record<string, unknown>`,
			// matching the wider shape `CreateConfigParameters['storage']`
			// expects. Without it, the narrower `keyof StorageItemMap` key
			// type is not assignable to the config's `string`-keyed Storage.
			storage: createStorage<Record<string, unknown>>({
				storage: cookieStorage,
			}),
		})
	: null;

/** Underlying wagmi `Config`; `null` mirrors `wagmiAdapter`. */
export const wagmiConfig = wagmiAdapter?.wagmiConfig ?? null;
