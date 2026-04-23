import { z } from 'zod';

import {
	tokenPricingEntrySchema,
	type RaffleCryptoOptions,
	type TokenPricingEntry,
} from '@/types/raffle';

// ==========================================
// Schema + Type
// ==========================================

/** Schema for crypto form field values shared between create and edit forms */
export const cryptoFormFieldsSchema = z.object({
	acceptsCrypto: z.boolean(),
	cryptoChainIds: z.array(z.number()),
	cryptoTokens: z.array(z.string()),
	cryptoTokenPricing: z.array(tokenPricingEntrySchema),
});

export type CryptoFormFields = z.infer<typeof cryptoFormFieldsSchema>;

// ==========================================
// Helpers
// ==========================================

/**
 * Extracts crypto form field values from a raffle's `cryptoOptions` response.
 * Reverse-maps the pre-joined backend shape back to the raw inputs the form needs.
 *
 * Used by:
 * - Edit page `mapRaffleToFormData` (hydrate form from existing raffle)
 * - Diff utilities (compare original vs current)
 *
 * @param cryptoOptions - Structured crypto options from raffle (null = crypto disabled)
 * @returns Form-compatible crypto field values
 */
export function extractCryptoFormFields(
	cryptoOptions: RaffleCryptoOptions | null,
): CryptoFormFields {
	if (!cryptoOptions) {
		return {
			acceptsCrypto: false,
			cryptoChainIds: [],
			cryptoTokens: [],
			cryptoTokenPricing: [],
		};
	}

	const cryptoChainIds = cryptoOptions.chains.map(chain => chain.chainId);

	// Flatten and deduplicate token IDs across all chains
	const cryptoTokens = [
		...new Set(
			cryptoOptions.chains.flatMap(chain =>
				chain.tokens.map(token => token.tokenId),
			),
		),
	];

	// Extract non-stablecoin pricing, deduplicated by tokenId.
	// Stablecoins use a fixed 1:1 USD rate so they have no per-raffle price entry.
	const cryptoTokenPricing = cryptoOptions.chains
		.flatMap(chain =>
			// Filter guarantees token.price is truthy (non-null string), so the
			// downstream access in reduce is safe without a non-null assertion.
			chain.tokens.filter(
				(token): token is typeof token & { price: string } =>
					!token.isStablecoin && !!token.price,
			),
		)
		.reduce<TokenPricingEntry[]>((seen, token) => {
			if (!seen.some(entry => entry.tokenId === token.tokenId)) {
				seen.push({ tokenId: token.tokenId, price: token.price });
			}
			return seen;
		}, []);

	return {
		acceptsCrypto: true,
		cryptoChainIds,
		cryptoTokens,
		cryptoTokenPricing,
	};
}

/**
 * Returns a human-readable summary of crypto payment configuration.
 * Used in both create and edit review steps.
 *
 * @param acceptsCrypto - Whether crypto payments are enabled
 * @param cryptoChainIds - Selected chain IDs
 * @param cryptoTokens - Selected token IDs
 * @param totalChains - Total available chains (to detect "all selected")
 * @param totalTokens - Total available tokens (to detect "all selected")
 * @returns Summary string like "All chains · 3 token(s)" or "Card only"
 */
export interface CryptoSummaryInput {
	acceptsCrypto: boolean;
	cryptoChainIds: number[];
	cryptoTokens: string[];
	/** Total available chains — set to detect "all selected". */
	totalChains?: number;
	/** Total available tokens — set to detect "all selected". */
	totalTokens?: number;
}

export function getCryptoSummary(input: CryptoSummaryInput): string {
	const {
		acceptsCrypto,
		cryptoChainIds,
		cryptoTokens,
		totalChains,
		totalTokens,
	} = input;
	if (!acceptsCrypto) return 'Card only';

	const chainsAllSelected =
		totalChains !== undefined && cryptoChainIds.length === totalChains;
	const tokensAllSelected =
		totalTokens !== undefined && cryptoTokens.length === totalTokens;

	const chains = chainsAllSelected
		? 'All chains'
		: `${cryptoChainIds.length} chain(s)`;
	const tokens = tokensAllSelected
		? 'All tokens'
		: `${cryptoTokens.length} token(s)`;

	return `${chains} \u00B7 ${tokens}`;
}
