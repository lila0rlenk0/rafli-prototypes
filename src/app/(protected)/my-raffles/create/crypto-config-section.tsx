'use client';

import {
	MultiSelect,
	type MultiSelectOption,
} from '@/components/ui/multi-select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { CHAIN_ICONS } from '@/lib/web3/chain-icons';
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
	/** Selected chain IDs (empty = all chains) */
	cryptoChainIds: number[];
	/** Selected token IDs (empty = all tokens) */
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
 * Backend semantics: empty `cryptoChainIds` / `cryptoTokens` = "all allowed".
 * UI maps this as: all items selected = send empty array (all).
 * Partial selection = send selected IDs only.
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

	// Compute available tokens based on selected chains.
	// When no chains are selected (= all), show all tokens from all chains.
	// When specific chains are selected, show the union of tokens across those chains.
	const availableTokens = useMemo(
		function computeAvailableTokens() {
			if (!cryptoConfig) return [];
			const chains =
				selectedChainIds.length === 0
					? cryptoConfig.chains
					: cryptoConfig.chains.filter(c =>
							selectedChainIds.includes(c.chainId),
						);

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
		[cryptoConfig, selectedChainIds],
	);

	// Identify non-stablecoin tokens that need pricing
	const nonStablecoinTokens = useMemo(
		function filterNonStablecoins() {
			if (selectedTokenIds.length === 0) {
				// "All tokens" mode — every non-stablecoin needs pricing
				return availableTokens.filter(t => !t.isStablecoin);
			}
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
			if (!cryptoConfig) return [];
			return cryptoConfig.chains.map(function mapChain(
				chain: CryptoChainConfig,
			) {
				const chainIcon = CHAIN_ICONS[chain.chainId];
				return {
					value: chain.chainId.toString(),
					label: chain.name,
					icon: chainIcon ? (
						<span
							className="flex size-5 items-center justify-center overflow-hidden rounded-full"
							style={{ background: chainIcon.iconBackground }}
						>
							<chainIcon.icon className="size-3.5" />
						</span>
					) : undefined,
				};
			});
		},
		[cryptoConfig],
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

	// In "all" mode (empty array), show all chains as visually selected.
	const chainSelectValue = useMemo(
		function computeChainSelectValue() {
			if (!cryptoConfig) return [];
			if (selectedChainIds.length === 0) {
				return cryptoConfig.chains.map(c => c.chainId.toString());
			}
			return selectedChainIds.map(id => id.toString());
		},
		[cryptoConfig, selectedChainIds],
	);

	// Token select value — in "all" mode, visually select everything
	const tokenSelectValue = useMemo(
		function computeTokenSelectValue() {
			if (selectedTokenIds.length === 0) {
				return availableTokens.map(t => t.tokenId);
			}
			return selectedTokenIds;
		},
		[availableTokens, selectedTokenIds],
	);

	// ==========================================
	// Handlers
	// ==========================================

	/** Forwards the crypto toggle value to the parent form */
	function handleAcceptsCryptoChange(checked: boolean) {
		onFieldChange('acceptsCrypto', checked);
	}

	/** Selects all chains (empty array = "all" mode) */
	function handleSelectAllChains() {
		onFieldChange('cryptoChainIds', []);
	}

	/** Selects all tokens (empty array = "all" mode) and clears stale pricing */
	function handleSelectAllTokens() {
		onFieldChange('cryptoTokens', []);
		onFieldChange('cryptoTokenPricing', []);
	}

	/**
	 * Handles chain multi-select value changes.
	 * Converts string[] back to number[] and prunes orphaned tokens/pricing.
	 */
	function handleChainValueChange(values: string[]) {
		// If all chains selected, store empty array (= "all" mode)
		const allSelected =
			cryptoConfig && values.length === cryptoConfig.chains.length;
		const nextIds = allSelected ? [] : values.map(Number);
		onFieldChange('cryptoChainIds', nextIds);

		// Prune tokens no longer available on any selected chain
		if (selectedTokenIds.length > 0 && cryptoConfig) {
			const nextChains =
				nextIds.length === 0
					? cryptoConfig.chains
					: cryptoConfig.chains.filter(c => nextIds.includes(c.chainId));
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
		// If all tokens selected, store empty array (= "all" mode)
		const allSelected = values.length === availableTokens.length;
		const nextTokens = allSelected ? [] : values;
		onFieldChange('cryptoTokens', nextTokens);

		// Remove pricing for any non-stablecoin tokens that were deselected
		if (!allSelected) {
			const deselected = selectedTokenIds.filter(id => !values.includes(id));
			if (deselected.length > 0) {
				const nonStableDeselected = deselected.filter(id => {
					const token = availableTokens.find(t => t.tokenId === id);
					return token && !token.isStablecoin;
				});
				if (nonStableDeselected.length > 0) {
					onFieldChange(
						'cryptoTokenPricing',
						tokenPricing.filter(
							p => !nonStableDeselected.includes(p.tokenId),
						),
					);
				}
			}
		} else {
			// Switching to "all" mode — clear stale pricing
			onFieldChange('cryptoTokenPricing', []);
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
			{!acceptsCrypto && (
				<div className="flex items-center gap-2 rounded-lg bg-gray-50 p-3">
					<InfoIcon className="size-4 text-gray-400" />
					<span className="text-sm text-gray-500">
						Only card payments (Stripe) will be available
					</span>
				</div>
			)}

			{/* Expanded state — chain/token config */}
			{acceptsCrypto && (
				<>
					{/* Loading state while fetching global config */}
					{isLoading && (
						<div className="flex items-center justify-center gap-2 py-8">
							<Loader2 className="size-4 animate-spin text-gray-400" />
							<span className="text-sm text-gray-500">
								Loading crypto configuration...
							</span>
						</div>
					)}

					{/* Config loaded */}
					{cryptoConfig && (
						<div className="flex flex-col gap-6">
							{/* Chain + Token selectors — side by side */}
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								{/* Chain selection */}
								<div className="flex flex-col gap-2">
									<div className="flex items-center justify-between">
										<label className="text-sm font-medium">Chains</label>
										<button
											type="button"
											disabled={selectedChainIds.length === 0}
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
											disabled={selectedTokenIds.length === 0}
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
							{nonStablecoinTokens.length > 0 && (
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
							)}

							{/* Info banner */}
							<div className="flex items-center gap-2 rounded-lg bg-[#E1F8FF] p-3">
								<InfoIcon className="size-4 shrink-0 text-[#2870BD]" />
								<span className="text-sm text-[#2870BD]">
									Crypto config is validated at publish time. Ensure all
									non-stablecoin tokens have pricing set before publishing.
								</span>
							</div>
						</div>
					)}
				</>
			)}
		</div>
	);
}
