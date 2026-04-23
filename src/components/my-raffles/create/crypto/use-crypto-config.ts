'use client';

import { useMemo } from 'react';

import { SUPPORTED_WEB3_CHAIN_IDS } from '@/lib/web3/config/constants';
import type {
	CryptoConfig,
	CryptoChainConfig,
	CryptoConfigToken,
} from '@/types/crypto-config';
import type { TokenPricingEntry } from '@/types/raffle';

/** Field names writable back to the wizard form via `onFieldChange`. */
export type CryptoConfigField =
	| 'acceptsCrypto'
	| 'cryptoChainIds'
	| 'cryptoTokens'
	| 'cryptoTokenPricing';

/** Value unions mirroring each field's payload type — keeps prop-drill type-safe. */
export type CryptoConfigFieldValue =
	| boolean
	| number[]
	| string[]
	| TokenPricingEntry[];

/** Writer passed down from the create/edit wizard — same shape for both forms. */
export type CryptoConfigFieldWriter = (
	field: CryptoConfigField,
	value: CryptoConfigFieldValue,
) => void;

/**
 * Filter backend chains down to the set this FE build actually supports.
 *
 * @returns Chain configs whose `chainId` is in `SUPPORTED_WEB3_CHAIN_IDS`.
 */
function filterSupportedChains(
	cryptoConfig: CryptoConfig | undefined,
): CryptoChainConfig[] {
	if (!cryptoConfig) return [];
	return cryptoConfig.chains.filter(c =>
		(SUPPORTED_WEB3_CHAIN_IDS as readonly number[]).includes(c.chainId),
	);
}

/**
 * Build the deduplicated token pool for the currently selected chains. The
 * same `tokenId` can exist on multiple chains — we surface it once.
 *
 * @returns Tokens deployed on the currently selected chains, deduped by `tokenId`.
 */
function computeAvailableTokens(
	supportedChains: CryptoChainConfig[],
	selectedChainIds: number[],
	options: { allChainsSelected: boolean },
): CryptoConfigToken[] {
	const { allChainsSelected } = options;
	const chains = allChainsSelected
		? supportedChains
		: supportedChains.filter(c => selectedChainIds.includes(c.chainId));
	const seen = new Set<string>();
	const tokens: CryptoConfigToken[] = [];
	for (const chain of chains) {
		for (const token of chain.tokens) {
			if (!seen.has(token.tokenId)) {
				seen.add(token.tokenId);
				tokens.push(token);
			}
		}
	}
	return tokens;
}

interface CryptoConfigContext {
	supportedChains: CryptoChainConfig[];
	availableTokens: CryptoConfigToken[];
	selectedTokenIds: string[];
	tokenPricing: TokenPricingEntry[];
	onFieldChange: CryptoConfigFieldWriter;
}

/**
 * Build the chain-change handler. Writes the new chain ids, then prunes any
 * tokens + pricing orphaned by the new selection so the form never references
 * a token that isn't available on a selected chain.
 *
 * @returns Handler that accepts the raw string[] the `MultiSelect` emits.
 */
function buildChainValueChangeHandler(ctx: CryptoConfigContext) {
	return function onChainValueChange(values: string[]) {
		const nextIds = values.map(Number);
		ctx.onFieldChange('cryptoChainIds', nextIds);
		if (ctx.selectedTokenIds.length === 0) return;
		const nextChains = ctx.supportedChains.filter(c =>
			nextIds.includes(c.chainId),
		);
		const availableIds = new Set(
			nextChains.flatMap(c => c.tokens.map(t => t.tokenId)),
		);
		const prunedTokens = ctx.selectedTokenIds.filter(id =>
			availableIds.has(id),
		);
		if (prunedTokens.length === ctx.selectedTokenIds.length) return;
		ctx.onFieldChange('cryptoTokens', prunedTokens);
		ctx.onFieldChange(
			'cryptoTokenPricing',
			ctx.tokenPricing.filter(p => prunedTokens.includes(p.tokenId)),
		);
	};
}

/**
 * Build the token-change handler. Writes the new token ids, then drops
 * pricing rows for any non-stablecoin token that just got deselected so the
 * form never carries pricing for a hidden token.
 *
 * @returns Handler that accepts the raw string[] the `MultiSelect` emits.
 */
function buildTokenValueChangeHandler(ctx: CryptoConfigContext) {
	return function onTokenValueChange(values: string[]) {
		ctx.onFieldChange('cryptoTokens', values);
		const deselected = ctx.selectedTokenIds.filter(id => !values.includes(id));
		if (deselected.length === 0) return;
		const nonStableDeselected = deselected.filter(id => {
			const token = ctx.availableTokens.find(t => t.tokenId === id);
			return token ? !token.isStablecoin : false;
		});
		if (nonStableDeselected.length === 0) return;
		ctx.onFieldChange(
			'cryptoTokenPricing',
			ctx.tokenPricing.filter(p => !nonStableDeselected.includes(p.tokenId)),
		);
	};
}

/**
 * Build the per-token price-change handler. Upserts the price entry so a
 * patch from the input never creates a second row for the same token.
 *
 * @returns Handler that accepts `(tokenId, price)` from a pricing row.
 */
function buildPriceChangeHandler(ctx: CryptoConfigContext) {
	return function onPriceChange(tokenId: string, price: string) {
		const existing = ctx.tokenPricing.some(p => p.tokenId === tokenId);
		const next = existing
			? ctx.tokenPricing.map(p => (p.tokenId === tokenId ? { ...p, price } : p))
			: [...ctx.tokenPricing, { tokenId, price }];
		ctx.onFieldChange('cryptoTokenPricing', next);
	};
}

/**
 * Build the "select all" handlers for chains + tokens. Writes the full id
 * list for the respective field so partial state never leaks through.
 *
 * @returns `{ onSelectAllChains, onSelectAllTokens }` bound to the context.
 */
function buildSelectAllHandlers(ctx: CryptoConfigContext) {
	return {
		onSelectAllChains: function onSelectAllChains() {
			ctx.onFieldChange(
				'cryptoChainIds',
				ctx.supportedChains.map(c => c.chainId),
			);
		},
		onSelectAllTokens: function onSelectAllTokens() {
			ctx.onFieldChange(
				'cryptoTokens',
				ctx.availableTokens.map(t => t.tokenId),
			);
		},
	};
}

interface UseCryptoConfigSectionParams {
	cryptoConfig: CryptoConfig | undefined;
	selectedChainIds: number[];
	selectedTokenIds: string[];
	tokenPricing: TokenPricingEntry[];
	onFieldChange: CryptoConfigFieldWriter;
}

interface UseCryptoConfigSectionReturn {
	supportedChains: CryptoChainConfig[];
	availableTokens: CryptoConfigToken[];
	nonStablecoinTokens: CryptoConfigToken[];
	allChainsSelected: boolean;
	allTokensSelected: boolean;
	onSelectAllChains: () => void;
	onSelectAllTokens: () => void;
	onChainValueChange: (values: string[]) => void;
	onTokenValueChange: (values: string[]) => void;
	onPriceChange: (tokenId: string, price: string) => void;
}

/**
 * Derived-state + handler hub for the crypto config section.
 *
 * Centralises chain/token filtering and the pruning rules that keep
 * `cryptoTokens` + `cryptoTokenPricing` aligned with the current selection.
 *
 * @returns Derived lists and pre-bound handlers for the selector + pricing UIs.
 */
export function useCryptoConfigSection({
	cryptoConfig,
	selectedChainIds,
	selectedTokenIds,
	tokenPricing,
	onFieldChange,
}: UseCryptoConfigSectionParams): UseCryptoConfigSectionReturn {
	const supportedChains = useMemo(
		() => filterSupportedChains(cryptoConfig),
		[cryptoConfig],
	);
	const allChainsSelected = selectedChainIds.length >= supportedChains.length;
	const availableTokens = useMemo(
		() =>
			computeAvailableTokens(supportedChains, selectedChainIds, {
				allChainsSelected,
			}),
		[supportedChains, selectedChainIds, allChainsSelected],
	);
	const nonStablecoinTokens = useMemo(
		() =>
			availableTokens.filter(
				t => !t.isStablecoin && selectedTokenIds.includes(t.tokenId),
			),
		[availableTokens, selectedTokenIds],
	);
	const allTokensSelected =
		selectedTokenIds.length === availableTokens.length &&
		availableTokens.length > 0;

	const ctx: CryptoConfigContext = {
		supportedChains,
		availableTokens,
		selectedTokenIds,
		tokenPricing,
		onFieldChange,
	};
	const selectAll = buildSelectAllHandlers(ctx);

	return {
		supportedChains,
		availableTokens,
		nonStablecoinTokens,
		allChainsSelected,
		allTokensSelected,
		onSelectAllChains: selectAll.onSelectAllChains,
		onSelectAllTokens: selectAll.onSelectAllTokens,
		onChainValueChange: buildChainValueChangeHandler(ctx),
		onTokenValueChange: buildTokenValueChangeHandler(ctx),
		onPriceChange: buildPriceChangeHandler(ctx),
	};
}
