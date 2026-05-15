'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface CreditsUpsellCardProps {
	readonly href: string;
}

/**
 * Yellow upsell surfaced inside the payment picker when the user has no
 * credits. Teaches that credits exist as a saving lever — pairs visually
 * with the muted "Balance $0" credits row above so the picker reads as
 * "no credits today, but here's the entry point" instead of dead-ending.
 *
 * Body copy quantifies the saving lever (top-up bonus + Pro tier) so the
 * card carries an actionable promise rather than a generic "view packs"
 * link. The numbers are static placeholders mirroring the current
 * marketing pack tiers — when those tiers change, update the constant
 * below.
 *
 * The destination is supplied by the caller because the picker doesn't
 * own routing knowledge — `/pricing` is where the credit packs and Pro
 * tier are merchandised, so the "View packs" promise lands where users
 * can actually buy them.
 *
 * @returns Yellow link card pointing to the credits surface
 */
export function CreditsUpsellCard({ href }: CreditsUpsellCardProps) {
	return (
		<Link
			href={href}
			className="border-brand-dark bg-brand-yellow rounded-tender-card flex w-full flex-col gap-1 border px-4 py-3 transition-opacity duration-150 hover:opacity-90"
		>
			<span className="text-brand-dark text-sm font-semibold">
				Buy credits, save on every entry
			</span>
			<span className="text-brand-dark inline-flex flex-wrap items-center gap-x-1 text-sm">
				Top up $100, get up to $120 with Pro tier.
				<span className="inline-flex items-center gap-1">
					View packs
					<ArrowRight className="size-3.5" aria-hidden />
				</span>
			</span>
		</Link>
	);
}
