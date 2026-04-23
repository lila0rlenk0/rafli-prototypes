'use client';

import { Loader2 } from 'lucide-react';

import { ChainTokenSelector } from '@/components/my-raffles/create/crypto/chain-token-selector';
import { CryptoInfoBanner } from '@/components/my-raffles/create/crypto/crypto-info-banner';
import { CryptoPricingInputs } from '@/components/my-raffles/create/crypto/crypto-pricing-inputs';
import { CryptoToggleBanner } from '@/components/my-raffles/create/crypto/crypto-toggle-banner';
import {
	useCryptoConfigSection,
	type CryptoConfigFieldWriter,
} from '@/components/my-raffles/create/crypto/use-crypto-config';
import { useCryptoConfig } from '@/services/payment/use-crypto-config';
import type { TokenPricingEntry } from '@/types/raffle';

/**
 * Props for the crypto config section.
 *
 * Uses explicit value/setter props instead of passing `UseFormReturn` directly:
 * react-hook-form's `UseFormReturn` is invariant on its type parameter, so
 * sharing it across the create + edit wizards (which have different schemas)
 * causes a structural mismatch. A field-keyed writer decouples the component
 * from whichever concrete form type the caller happens to use.
 */
interface CryptoConfigSectionProps {
	acceptsCrypto: boolean;
	cryptoChainIds: number[];
	cryptoTokens: string[];
	cryptoTokenPricing: TokenPricingEntry[];
	onFieldChange: CryptoConfigFieldWriter;
}

/**
 * Crypto payment configuration section for raffle create + edit wizards.
 *
 * Composes four leaf pieces: the accept-crypto toggle banner, the chain/token
 * selector, the non-stablecoin pricing inputs and the publish-time info
 * banner. All derived state and pruning handlers live in `useCryptoConfigSection`
 * so this shell stays under the 150-line lint cap.
 *
 * @returns Crypto config card JSX.
 */
export function CryptoConfigSection({
	acceptsCrypto,
	cryptoChainIds,
	cryptoTokens,
	cryptoTokenPricing,
	onFieldChange,
}: CryptoConfigSectionProps) {
	// Global crypto config is cached for 10min by `useCryptoConfig` — multiple
	// mounts (wizard step changes, edit wizard) dedupe to a single fetch.
	const { data: cryptoConfig, isLoading } = useCryptoConfig();

	const {
		supportedChains,
		availableTokens,
		nonStablecoinTokens,
		allChainsSelected,
		allTokensSelected,
		onSelectAllChains,
		onSelectAllTokens,
		onChainValueChange,
		onTokenValueChange,
		onPriceChange,
	} = useCryptoConfigSection({
		cryptoConfig,
		selectedChainIds: cryptoChainIds,
		selectedTokenIds: cryptoTokens,
		tokenPricing: cryptoTokenPricing,
		onFieldChange,
	});

	const handleAcceptsCryptoChange = (checked: boolean) => {
		onFieldChange('acceptsCrypto', checked);
	};

	return (
		<div className="flex flex-col gap-6 rounded-2xl bg-white p-8">
			<CryptoToggleBanner
				acceptsCrypto={acceptsCrypto}
				onAcceptsCryptoChange={handleAcceptsCryptoChange}
			/>

			{acceptsCrypto && isLoading ? (
				<div className="flex items-center justify-center gap-2 py-8">
					<Loader2
						className="size-4 animate-spin text-gray-400"
						aria-hidden="true"
					/>
					<span className="text-sm text-gray-500">
						Loading crypto configuration...
					</span>
				</div>
			) : null}

			{acceptsCrypto && cryptoConfig ? (
				<div className="flex flex-col gap-6">
					<ChainTokenSelector
						supportedChains={supportedChains}
						availableTokens={availableTokens}
						selectedChainIds={cryptoChainIds}
						selectedTokenIds={cryptoTokens}
						allChainsSelected={allChainsSelected}
						allTokensSelected={allTokensSelected}
						onChainValueChange={onChainValueChange}
						onTokenValueChange={onTokenValueChange}
						onSelectAllChains={onSelectAllChains}
						onSelectAllTokens={onSelectAllTokens}
					/>
					<CryptoPricingInputs
						nonStablecoinTokens={nonStablecoinTokens}
						tokenPricing={cryptoTokenPricing}
						onPriceChange={onPriceChange}
					/>
					<CryptoInfoBanner />
				</div>
			) : null}
		</div>
	);
}
