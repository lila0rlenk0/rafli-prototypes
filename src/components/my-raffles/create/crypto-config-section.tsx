'use client';

import {
	MultiSelect,
	type MultiSelectOption,
} from '@/components/ui/multi-select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { CHAIN_ICONS } from '@/lib/web3/chain-icons';
import { SUPPORTED_WEB3_CHAIN_IDS } from '@/lib/web3/constants';
import { useCryptoConfig } from '@/services/payment/use-crypto-config';
import type {
	CryptoChainConfig,
	CryptoConfigToken,
} from '@/types/crypto-config';
import type { TokenPricingEntry } from '@/types/raffle';
import { InfoIcon, Loader2, Wallet } from 'lucide-react';
import type { ChangeEvent } from 'react';
import { useMemo } from 'react';

/**
 * Props for the crypto config section.
 *
 * Uses explicit value/setter props instead of passing UseFormReturn directly.
 * react-hook-form's UseFormReturn is invariant on its type parameter, so
 * passing it from different form types (create vs edit) causes type errors.
 * This pattern decouples the component from the specific form schema.
 */
interface CryptoConfigSectionProps {
	/** Whether crypto payments are enabled */
	acceptsCrypto: boolean;
	/** Selected chain IDs */
	cryptoChainIds: number[];
	/** Selected token IDs */
	cryptoTokens: string[];
	/** Per-ticket pricing for non-stablecoin tokens */
	cryptoTokenPricing: TokenPricingEntry[];
	/** Callback to update a specific crypto form field */
	onFieldChange: (
		field:
			| 'acceptsCrypto'
			| 'cryptoChainIds'
			| 'cryptoTokens'
			| 'cryptoTokenPricing',
		value: boolean | number[] | string[] | TokenPricingEntry[],
	) => void;
}

// ==========================================
// Component
// ==========================================

/**
 * Crypto payment configuration section for raffle create/edit forms.
 *
 * Fetches global crypto config (chains + tokens) from backend,
 * then renders chain/token multi-select dropdowns and pricing inputs.
 *
 * Always sends explicit arrays — never empty. Selecting all items
 * sends every ID, partial selection sends only selected IDs.
 */
export function CryptoConfigSection({
	acceptsCrypto,
	cryptoChainIds: selectedChainIds,
	cryptoTokens: selectedTokenIds,
	cryptoTokenPricing: tokenPricing,
	onFieldChange,
}: CryptoConfigSectionProps) {
	// Fetch global config (cached 10min by useCryptoConfig)
	const { data: cryptoConfig, isLoading } = useCryptoConfig();

	// useMemo: filter backend chains to only those supported in this environment.
	// Avoids re-filtering on every render — cryptoConfig changes only on initial fetch.
	const supportedChains = useMemo(
		function filterSupportedChains() {
			if (!cryptoConfig) return [];
			return cryptoConfig.chains.filter(c =>
				(SUPPORTED_WEB3_CHAIN_IDS as readonly number[]).includes(c.chainId),
			);
		},
		[cryptoConfig],
	);

	/** Whether all supported chains are selected */
	const allChainsSelected = selectedChainIds.length >= supportedChains.length;

	// useMemo: compute available tokens based on selected chains.
	// Re-computes when chain selection changes — deduplicates cross-chain tokens.
	const availableTokens = useMemo(
		function computeAvailableTokens() {
			const chains = allChainsSelected
				? supportedChains
				: supportedChains.filter(c => selectedChainIds.includes(c.chainId));

			// Deduplicate tokens by tokenId — same token can appear on multiple chains
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
		},
		[supportedChains, selectedChainIds, allChainsSelected],
	);

	// useMemo: identify non-stablecoin tokens that need manual pricing.
	// Stablecoins use 1:1 USD pricing — only non-stables need a price input.
	const nonStablecoinTokens = useMemo(
		function filterNonStablecoins() {
			return availableTokens.filter(
				t => !t.isStablecoin && selectedTokenIds.includes(t.tokenId),
			);
		},
		[availableTokens, selectedTokenIds],
	);

	// ==========================================
	// MultiSelect option builders
	// ==========================================

	/** Builds chain options with icons for the multi-select */
	const chainOptions: MultiSelectOption[] = useMemo(
		function buildChainOptions() {
			return supportedChains.map(function mapChain(chain: CryptoChainConfig) {
				const ChainIcon = CHAIN_ICONS[chain.chainId];
				return {
					value: chain.chainId.toString(),
					label: chain.name,
					icon: ChainIcon ? (
						<ChainIcon variant="branded" size={20} className="shrink-0" />
					) : undefined,
				};
			});
		},
		[supportedChains],
	);

	/** Builds token options with stablecoin/custom labels */
	const tokenOptions: MultiSelectOption[] = useMemo(
		function buildTokenOptions() {
			return availableTokens.map(function mapToken(token: CryptoConfigToken) {
				return {
					value: token.tokenId,
					label: token.symbol,
					description: token.isStablecoin ? '1:1 USD' : 'Custom price',
				};
			});
		},
		[availableTokens],
	);

	// ==========================================
	// Chain value bridging
	// ==========================================

	const chainSelectValue = useMemo(
		function computeChainSelectValue() {
			return selectedChainIds.map(id => id.toString());
		},
		[selectedChainIds],
	);

	const tokenSelectValue = selectedTokenIds;

	// ==========================================
	// Handlers
	// ==========================================

	/** Forwards the crypto toggle value to the parent form */
	function handleAcceptsCryptoChange(checked: boolean) {
		onFieldChange('acceptsCrypto', checked);
	}

	/** Selects all supported chains explicitly */
	function handleSelectAllChains() {
		onFieldChange(
			'cryptoChainIds',
			supportedChains.map(c => c.chainId),
		);
	}

	/** Selects all available tokens explicitly */
	function handleSelectAllTokens() {
		onFieldChange(
			'cryptoTokens',
			availableTokens.map(t => t.tokenId),
		);
	}

	/**
	 * Handles chain multi-select value changes.
	 * Converts string[] back to number[] and prunes orphaned tokens/pricing.
	 */
	function handleChainValueChange(values: string[]) {
		const nextIds = values.map(Number);
		onFieldChange('cryptoChainIds', nextIds);

		// Prune tokens no longer available on any selected chain
		if (selectedTokenIds.length > 0) {
			const nextChains = supportedChains.filter(c =>
				nextIds.includes(c.chainId),
			);
			const availableIds = new Set(
				nextChains.flatMap(c => c.tokens.map(t => t.tokenId)),
			);
			const prunedTokens = selectedTokenIds.filter(id => availableIds.has(id));
			if (prunedTokens.length !== selectedTokenIds.length) {
				onFieldChange('cryptoTokens', prunedTokens);
				const prunedPricing = tokenPricing.filter(p =>
					prunedTokens.includes(p.tokenId),
				);
				onFieldChange('cryptoTokenPricing', prunedPricing);
			}
		}
	}

	/**
	 * Handles token multi-select value changes.
	 * Prunes pricing for deselected non-stablecoin tokens.
	 */
	function handleTokenValueChange(values: string[]) {
		onFieldChange('cryptoTokens', values);

		// Remove pricing for any non-stablecoin tokens that were deselected
		const deselected = selectedTokenIds.filter(id => !values.includes(id));
		if (deselected.length > 0) {
			const nonStableDeselected = deselected.filter(id => {
				const token = availableTokens.find(t => t.tokenId === id);
				return token && !token.isStablecoin;
			});
			if (nonStableDeselected.length > 0) {
				onFieldChange(
					'cryptoTokenPricing',
					tokenPricing.filter(p => !nonStableDeselected.includes(p.tokenId)),
				);
			}
		}
	}

	/** Updates the price for a specific non-stablecoin token */
	function handlePriceChange(tokenId: string, price: string) {
		const existing = tokenPricing.find(p => p.tokenId === tokenId);
		if (existing) {
			onFieldChange(
				'cryptoTokenPricing',
				tokenPricing.map(p => (p.tokenId === tokenId ? { ...p, price } : p)),
			);
		} else {
			onFieldChange('cryptoTokenPricing', [
				...tokenPricing,
				{ tokenId, price },
			]);
		}
	}

	/** Wraps handlePriceChange for input onChange — captures tokenId per row */
	function handlePriceInputChange(tokenId: string) {
		return function onChange(e: ChangeEvent<HTMLInputElement>) {
			handlePriceChange(tokenId, e.target.value);
		};
	}

	/** Gets the current price value for a token from form state */
	function getTokenPrice(tokenId: string): string {
		return tokenPricing.find(p => p.tokenId === tokenId)?.price ?? '';
	}

	// ==========================================
	// Render
	// ==========================================

	return (
		<div className="flex flex-col gap-6 rounded-2xl bg-white p-8">
			{/* Header with toggle */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<Wallet className="size-5 text-gray-600" />
					<div>
						<h2 className="text-xl font-semibold">Crypto Payments</h2>
						<p className="text-sm text-gray-500">
							Accept ERC-20 token payments alongside card
						</p>
					</div>
				</div>
				<Switch
					checked={acceptsCrypto}
					onCheckedChange={handleAcceptsCryptoChange}
				/>
			</div>

			{/* Collapsed state — nothing else to show */}
			{!acceptsCrypto ? (
				<div className="flex items-center gap-2 rounded-lg bg-gray-50 p-3">
					<InfoIcon className="size-4 text-gray-400" />
					<span className="text-sm text-gray-500">
						Only card payments (Stripe) will be available
					</span>
				</div>
			) : null}

			{/* Expanded state — chain/token config */}
			{acceptsCrypto ? (
				<>
					{/* Loading state while fetching global config */}
					{isLoading ? (
						<div className="flex items-center justify-center gap-2 py-8">
							<Loader2 className="size-4 animate-spin text-gray-400" />
							<span className="text-sm text-gray-500">
								Loading crypto configuration...
							</span>
						</div>
					) : null}

					{/* Config loaded */}
					{cryptoConfig ? (
						<div className="flex flex-col gap-6">
							{/* Chain + Token selectors — side by side */}
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								{/* Chain selection */}
								<div className="flex flex-col gap-2">
									<div className="flex items-center justify-between">
										<label className="text-sm font-medium">Chains</label>
										<button
											type="button"
											disabled={allChainsSelected}
											className="text-primary cursor-pointer text-xs underline disabled:cursor-not-allowed disabled:opacity-50"
											onClick={handleSelectAllChains}
										>
											Select all
										</button>
									</div>
									<MultiSelect
										options={chainOptions}
										value={chainSelectValue}
										onValueChange={handleChainValueChange}
										placeholder="Select chains..."
									/>
								</div>

								{/* Token selection */}
								<div className="flex flex-col gap-2">
									<div className="flex items-center justify-between">
										<label className="text-sm font-medium">Tokens</label>
										<button
											type="button"
											disabled={
												selectedTokenIds.length === availableTokens.length
											}
											className="text-primary cursor-pointer text-xs underline disabled:cursor-not-allowed disabled:opacity-50"
											onClick={handleSelectAllTokens}
										>
											Select all
										</button>
									</div>
									<MultiSelect
										options={tokenOptions}
										value={tokenSelectValue}
										onValueChange={handleTokenValueChange}
										placeholder="Select tokens..."
									/>
								</div>
							</div>

							{/* Non-stablecoin pricing */}
							{nonStablecoinTokens.length > 0 ? (
								<div className="flex flex-col gap-3">
									<label className="text-sm font-medium">
										Token Pricing (per ticket)
									</label>
									<p className="text-xs text-gray-500">
										Set the price per ticket for each non-stablecoin token.
										Stablecoins use 1:1 USD pricing automatically.
									</p>
									<div className="flex flex-col gap-3">
										{nonStablecoinTokens.map(token => (
											<div
												key={token.tokenId}
												className="flex items-center gap-3"
											>
												<span className="w-16 text-sm font-medium">
													{token.symbol}
												</span>
												<Input
													type="text"
													inputMode="decimal"
													placeholder="0.00"
													value={getTokenPrice(token.tokenId)}
													onChange={handlePriceInputChange(token.tokenId)}
													className="max-w-40 border-[#E5E5E5]"
												/>
												<span className="text-xs text-gray-400">
													{token.symbol} per ticket
												</span>
											</div>
										))}
									</div>
								</div>
							) : null}

							{/* Info banner */}
							<div className="flex items-center gap-2 rounded-lg bg-[#E1F8FF] p-3">
								<InfoIcon className="size-4 shrink-0 text-[#2870BD]" />
								<span className="text-sm text-[#2870BD]">
									Crypto config is validated at publish time. Ensure all
									non-stablecoin tokens have pricing set before publishing.
								</span>
							</div>
						</div>
					) : null}
				</>
			) : null}
		</div>
	);
}
