import { InfoIcon } from 'lucide-react';

/**
 * Static warning shown while the crypto config panel is expanded. Reminds the
 * host that non-stablecoin pricing is enforced at publish time — mirrors the
 * backend `POST /raffles` validation so hosts see the constraint before the
 * rejection round-trip. Kept as its own leaf component so copy tweaks (legal
 * reviews, i18n) happen in isolation from the form logic.
 *
 * @returns Publish-time reminder banner JSX.
 */
export function CryptoInfoBanner() {
	return (
		<div className="flex items-center gap-2 rounded-lg bg-sky-100 p-3">
			<InfoIcon
				className="text-brand-blue size-4 shrink-0"
				aria-hidden="true"
			/>
			<span className="text-brand-blue text-sm">
				Crypto config is validated at publish time. Ensure all non-stablecoin
				tokens have pricing set before publishing.
			</span>
		</div>
	);
}
