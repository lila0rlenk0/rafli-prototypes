'use client';

import { useMemo } from 'react';

import {
	MultiSelect,
	type MultiSelectOption,
} from '@/components/ui/multi-select';
import { CHAIN_ICONS } from '@/lib/web3/format/chain-icons';
import type {
	CryptoChainConfig,
	CryptoConfigToken,
} from '@/types/crypto-config';

interface ChainTokenSelectorProps {
	supportedChains: CryptoChainConfig[];
	availableTokens: CryptoConfigToken[];
	selectedChainIds: number[];
	selectedTokenIds: string[];
	allChainsSelected: boolean;
	allTokensSelected: boolean;
	onChainValueChange: (values: string[]) => void;
	onTokenValueChange: (values: string[]) => void;
	onSelectAllChains: () => void;
	onSelectAllTokens: () => void;
}

interface SelectAllFieldProps {
	label: string;
	selectAllDisabled: boolean;
	onSelectAll: () => void;
	options: MultiSelectOption[];
	value: string[];
	placeholder: string;
	onValueChange: (values: string[]) => void;
}

/**
 * One column of the chain/token grid — label row with a "Select all" affordance
 * plus the `MultiSelect` body. Extracted so the parent selector stays under the
 * 3-level JSX nesting rule and so both columns share identical markup.
 *
 * @returns Label + "Select all" button + MultiSelect JSX.
 */
function SelectAllField({
	label,
	selectAllDisabled,
	onSelectAll,
	options,
	value,
	placeholder,
	onValueChange,
}: SelectAllFieldProps) {
	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center justify-between">
				<label className="text-sm font-medium">{label}</label>
				<button
					type="button"
					disabled={selectAllDisabled}
					className="text-primary cursor-pointer text-xs underline disabled:cursor-not-allowed disabled:opacity-50"
					onClick={onSelectAll}
				>
					Select all
				</button>
			</div>
			<MultiSelect
				options={options}
				value={value}
				onValueChange={onValueChange}
				placeholder={placeholder}
			/>
		</div>
	);
}

/**
 * Side-by-side chain + token pickers used when crypto payments are enabled.
 *
 * Chain values are stored as `number[]` in the form but `MultiSelect` works in
 * strings — the bridging (toString / Number) happens here so the rest of the
 * form never sees stringified chain IDs.
 *
 * @returns Two-column chain + token selector JSX.
 */
export function ChainTokenSelector({
	supportedChains,
	availableTokens,
	selectedChainIds,
	selectedTokenIds,
	allChainsSelected,
	allTokensSelected,
	onChainValueChange,
	onTokenValueChange,
	onSelectAllChains,
	onSelectAllTokens,
}: ChainTokenSelectorProps) {
	// Memoised per-chain options with the branded chain icon prefix.
	const chainOptions = useMemo<MultiSelectOption[]>(
		function buildChainOptions() {
			return supportedChains.map(function mapChain(chain) {
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

	// Token options carry a stable/custom hint so hosts know which will require pricing.
	const tokenOptions = useMemo<MultiSelectOption[]>(
		function buildTokenOptions() {
			return availableTokens.map(function mapToken(token) {
				return {
					value: token.tokenId,
					label: token.symbol,
					description: token.isStablecoin ? '1:1 USD' : 'Custom price',
				};
			});
		},
		[availableTokens],
	);

	// Bridge number[] -> string[] once so the MultiSelect value stays referentially stable between renders.
	const chainSelectValue = useMemo(
		function computeChainSelectValue() {
			return selectedChainIds.map(id => id.toString());
		},
		[selectedChainIds],
	);

	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<SelectAllField
				label="Chains"
				selectAllDisabled={allChainsSelected}
				onSelectAll={onSelectAllChains}
				options={chainOptions}
				value={chainSelectValue}
				placeholder="Select chains..."
				onValueChange={onChainValueChange}
			/>
			<SelectAllField
				label="Tokens"
				selectAllDisabled={allTokensSelected}
				onSelectAll={onSelectAllTokens}
				options={tokenOptions}
				value={selectedTokenIds}
				placeholder="Select tokens..."
				onValueChange={onTokenValueChange}
			/>
		</div>
	);
}
