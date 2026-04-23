import type { RaffleCryptoOptions, RaffleCryptoToken } from '@/types/raffle';

/**
 * Resolves tokens for a given chain from the caller-supplied raffle
 * options. Extracted so the handlers never reach back into the modal's
 * `getTokensForChain` closure.
 *
 * @param options - Raffle crypto options bundle
 * @param chainId - Chain to look up
 * @returns Token list — empty if the chain has no configured tokens
 */
export function tokensForChain(
	options: RaffleCryptoOptions,
	chainId: number,
): RaffleCryptoToken[] {
	return options.chains.find(c => c.chainId === chainId)?.tokens ?? [];
}
