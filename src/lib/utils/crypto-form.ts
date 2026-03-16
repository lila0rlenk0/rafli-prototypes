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

	// Extract chain IDs
	const cryptoChainIds = cryptoOptions.chains.map(c => c.chainId);

	// Flatten and deduplicate token IDs across all chains
	const cryptoTokens = [
		...new Set(cryptoOptions.chains.flatMap(c => c.tokens.map(t => t.tokenId))),
	];

	// Extract non-stablecoin pricing (deduplicated by tokenId)
	const cryptoTokenPricing = cryptoOptions.chains
		.flatMap(c => c.tokens.filter(t => !t.isStablecoin && t.price))
		.reduce<TokenPricingEntry[]>((acc, t) => {
			if (!acc.some(e => e.tokenId === t.tokenId)) {
				acc.push({ tokenId: t.tokenId, price: t.price! });
			}
			return acc;
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
 * @param cryptoChainIds - Selected chain IDs (empty = all)
 * @param cryptoTokens - Selected token IDs (empty = all)
 * @returns Summary string like "All chains · 3 token(s)" or "Card only"
 */
export function getCryptoSummary(
	acceptsCrypto: boolean,
	cryptoChainIds: number[],
	cryptoTokens: string[],
): string {
	if (!acceptsCrypto) return 'Card only';

	const chains =
		cryptoChainIds.length === 0
			? 'All chains'
			: `${cryptoChainIds.length} chain(s)`;
	const tokens =
		cryptoTokens.length === 0
			? 'All tokens'
			: `${cryptoTokens.length} token(s)`;

	return `${chains} \u00B7 ${tokens}`;
}
