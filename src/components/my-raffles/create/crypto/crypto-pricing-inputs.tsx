'use client';

import type { ChangeEvent } from 'react';

import { Input } from '@/components/ui/input';
import type { CryptoConfigToken } from '@/types/crypto-config';
import type { TokenPricingEntry } from '@/types/raffle';

interface CryptoPricingInputsProps {
	/** Non-stablecoin tokens currently selected — one input row per token. */
	nonStablecoinTokens: CryptoConfigToken[];
	/** Current pricing entries from the form. */
	tokenPricing: TokenPricingEntry[];
	/** Patch-or-upsert handler owned by the parent hook. */
	onPriceChange: (tokenId: string, price: string) => void;
}

interface PricingRowProps {
	token: CryptoConfigToken;
	value: string;
	onPriceChange: (tokenId: string, price: string) => void;
}

/**
 * Single pricing row for one non-stablecoin token. Extracted so the list
 * component stays within the 3-level JSX nesting cap and the per-row change
 * handler closes over `token.tokenId` without a renderer-scoped factory.
 *
 * @returns Row with token symbol, decimal input and "per ticket" suffix.
 */
function PricingRow({ token, value, onPriceChange }: PricingRowProps) {
	// Closes over the row's tokenId so `<Input>` stays agnostic of which token it drives.
	function handleChange(event: ChangeEvent<HTMLInputElement>) {
		onPriceChange(token.tokenId, event.target.value);
	}

	return (
		<div className="flex items-center gap-3">
			<span className="w-16 text-sm font-medium">{token.symbol}</span>
			<Input
				type="text"
				inputMode="decimal"
				placeholder="0.00"
				value={value}
				onChange={handleChange}
				aria-label={`Price per ticket in ${token.symbol}`}
				className="border-ink-200 max-w-40"
			/>
			<span className="text-xs text-gray-400">{token.symbol} per ticket</span>
		</div>
	);
}

/**
 * Per-token price inputs for non-stablecoin tokens.
 *
 * Rendered only when at least one non-stablecoin is selected — stablecoins use
 * 1:1 USD pricing automatically so no manual entry is required for them.
 *
 * @returns Pricing section JSX, or `null` when no non-stablecoin tokens are selected.
 */
export function CryptoPricingInputs({
	nonStablecoinTokens,
	tokenPricing,
	onPriceChange,
}: CryptoPricingInputsProps) {
	if (nonStablecoinTokens.length === 0) return null;

	// Build a Map for O(1) price lookups — avoids an Array.find per render row.
	const priceByTokenId = new Map(
		tokenPricing.map(p => [p.tokenId, p.price] as const),
	);

	return (
		<div className="flex flex-col gap-3">
			<label className="text-sm font-medium">Token Pricing (per entry)</label>
			<p className="text-xs text-gray-500">
				Set the price per entry for each non-stablecoin token. Stablecoins use
				1:1 USD pricing automatically.
			</p>
			<div className="flex flex-col gap-3">
				{nonStablecoinTokens.map(token => (
					<PricingRow
						key={token.tokenId}
						token={token}
						value={priceByTokenId.get(token.tokenId) ?? ''}
						onPriceChange={onPriceChange}
					/>
				))}
			</div>
		</div>
	);
}
