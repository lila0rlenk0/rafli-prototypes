import type { RaffleCryptoOptions } from '@/types/raffle';

// ==========================================
// Helpers
// ==========================================

/**
 * Filters raffle crypto options down to chains this FE build can actually drive.
 *
 * Why centralise this:
 * - `TicketPurchaseCard` decides whether to show the crypto CTA at all
 * - `CryptoCheckoutModal` decides which chains are selectable once opened
 * - if those two checks diverge, users can land in an empty chain step with no exit
 *
 * We also require at least one token because a chain row with zero tokens is not a
 * valid checkout target, even if the chain itself exists in wagmi config.
 */
export function getSelectableCryptoChains(
	cryptoOptions: RaffleCryptoOptions | null | undefined,
	supportedChainIds: readonly number[],
): RaffleCryptoOptions['chains'] {
	if (!cryptoOptions) return [];

	const supportedChains = new Set<number>(supportedChainIds);

	return cryptoOptions.chains.filter(
		chain => supportedChains.has(chain.chainId) && chain.tokens.length > 0,
	);
}

/**
 * Boolean convenience wrapper for CTA-level gating.
 */
export function hasSelectableCryptoChains(
	cryptoOptions: RaffleCryptoOptions | null | undefined,
	supportedChainIds: readonly number[],
): boolean {
	return getSelectableCryptoChains(cryptoOptions, supportedChainIds).length > 0;
}
