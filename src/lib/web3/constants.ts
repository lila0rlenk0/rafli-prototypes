import type { AppKitNetwork } from '@reown/appkit/networks';
import {
	arbitrum,
	arbitrumSepolia,
	base,
	baseSepolia,
	mainnet,
	polygon,
	polygonAmoy,
	sepolia,
} from '@reown/appkit/networks';

import { clientEnv } from '@/env/client';

// ==========================================
// Chain Configuration
// ==========================================

/**
 * Production networks — mainnet EVM networks supporting USDC/USDT.
 */
const prodNetworks: [AppKitNetwork, ...AppKitNetwork[]] = [
	mainnet,
	arbitrum,
	base,
	polygon,
];

/**
 * Development/staging networks — testnets only, no mainnets.
 * Dev builds NEVER surface mainnets even if the backend allowlists them.
 */
const devNetworks: [AppKitNetwork, ...AppKitNetwork[]] = [
	sepolia,
	arbitrumSepolia,
	baseSepolia,
	polygonAmoy,
];

const isProd = clientEnv.NEXT_PUBLIC_APP_ENV === 'production';

/**
 * Networks used by Reown AppKit + wagmi.
 *
 * Consumed at config time (`WagmiAdapter` in `wagmi-config.ts`) and by
 * SSR-safe callers that need chain metadata without pulling in the full runtime.
 * Uses Reown's `AppKitNetwork` type (viem-compatible chain objects).
 */
export const configuredNetworks: [AppKitNetwork, ...AppKitNetwork[]] = isProd
	? prodNetworks
	: devNetworks;

// ==========================================
// SSR-Safe Constants
// ==========================================

/**
 * Whether Web3/crypto features are available.
 * Gated by Reown project ID — when unset, Web3 degrades gracefully.
 */
export const isWeb3Enabled = !!clientEnv.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

/**
 * Chain IDs the FE is configured to support in the current environment.
 * Intentionally differs between prod and non-prod.
 *
 * Reown's `AppKitNetwork.id` is typed `string | number` for CAIP-2 compatibility,
 * but all our configured EVM networks have numeric chain IDs at runtime.
 */
export const SUPPORTED_WEB3_CHAIN_IDS: number[] = configuredNetworks.map(
	network => network.id as number,
);
