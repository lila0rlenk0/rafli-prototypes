import { zeroAddress } from 'viem';

import type { RaffleCryptoOptions, RaffleCryptoToken } from '@/types/raffle';

// ==========================================
// Pure helpers for the session hook
// ==========================================

/**
 * Arguments for `buildRecoveredCheckoutToken`. Grouped as an object so the
 * helper stays under the `max-params` (3) cap and the call site reads as
 * a named record matching the backend→FE recovery shape.
 */
export interface BuildRecoveredTokenArgs {
	currency: string;
	chainId: number;
	fallbackToken: RaffleCryptoToken;
	cryptoOptions: RaffleCryptoOptions;
}

/**
 * Pure fallback-token synthesizer. Extracted so the hook body stays under
 * the 60-LOC `.ts` cap and the three-branch lookup (raffle match →
 * caller fallback → synthetic stablecoin) is unit-testable without
 * pulling in server-action imports.
 *
 * @param args - Currency + chain + caller fallback + raffle options
 * @returns The best-fit `RaffleCryptoToken` for display + local comparisons
 */
export function buildRecoveredCheckoutToken({
	currency,
	chainId,
	fallbackToken,
	cryptoOptions,
}: BuildRecoveredTokenArgs): RaffleCryptoToken {
	const recoveredSlug = currency.toLowerCase();

	// Try to find the token in raffle's crypto options for this chain
	const chainTokens =
		cryptoOptions.chains.find(c => c.chainId === chainId)?.tokens ?? [];
	const matchedToken = chainTokens.find(t => t.tokenId === recoveredSlug);
	if (matchedToken) return matchedToken;

	// Fallback to the caller-provided token if tokenId matches
	if (fallbackToken.tokenId === recoveredSlug) return fallbackToken;

	// Last resort — synthesize a token from the currency string.
	// Only reached when backend stores a token not in the raffle's current options.
	const isStablecoin = recoveredSlug === 'usdc' || recoveredSlug === 'usdt';
	return {
		tokenId: recoveredSlug,
		symbol: currency,
		price: isStablecoin ? null : '0',
		// Placeholder values — on-chain execution uses session's tokenAddress/amount,
		// not these fields. Only tokenId/symbol matter for display + matching.
		address: zeroAddress,
		decimals: isStablecoin ? 6 : 18,
		isStablecoin,
	};
}
