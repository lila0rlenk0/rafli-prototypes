import Link from 'next/link';

interface AccessPassDisclaimerProps {
	/**
	 * Raffle title — scopes the Access Pass framing to this specific
	 * raffle. This is a per-raffle checkout, not a platform-wide
	 * subscription, so the disclaimer names the raffle explicitly ("Access
	 * Pass for {title}") to match product reality. A regulator or court
	 * reading a generic "platform access" line on a per-raffle page would
	 * treat the reframe as pretextual — naming the raffle makes the
	 * per-raffle scope of the pass honest and defensible on its own terms.
	 *
	 * Optional with graceful fallback: when absent (empty trimmed string,
	 * unknown raffle), the headline degrades to scope-agnostic copy
	 * instead of rendering a dangling "for " phrase. The fallback is a
	 * safety net for partial data — the happy path always passes the
	 * title from the raffle detail page.
	 */
	raffleTitle?: string;
	/**
	 * Selected ticket quantity — drives the tiered content-library access
	 * duration surfaced in the disclaimer. More entries purchased → longer
	 * access period, reinforcing the reframe that the paid exchange is for
	 * platform access (with entries bundled) rather than for chance itself.
	 *
	 * Tiers: 1–9 → 1 month, 10–24 → 6 months, 25–99 → 12 months, 100+ →
	 * 24 months. Falls back to 1 month when absent or below 1.
	 */
	ticketQuantity?: number;
}

// Ticket-tier → content-library access duration. Longer ladders reward
// larger purchases with more non-entry value, strengthening the Access
// Pass reframe (platform access bundles entries, not the reverse).
const ACCESS_PASS_TIERS = [
	{ minQuantity: 100, months: 24 },
	{ minQuantity: 25, months: 12 },
	{ minQuantity: 10, months: 6 },
	{ minQuantity: 1, months: 1 },
] as const;

function resolveAccessMonths(quantity: number | undefined): number {
	const q = quantity ?? 1;
	// Tiers are sorted high → low so the first match is the widest bracket
	// the quantity qualifies for. Fallback handles q < 1 (edge case).
	const tier = ACCESS_PASS_TIERS.find(t => q >= t.minQuantity);
	return tier?.months ?? 1;
}

/**
 * Legal disclaimer rendered directly above every paid buy CTA.
 *
 * Copy strategy: lead with the raffle value proposition ("more entries,
 * better chances") so the block reinforces the purchase intent the user
 * already has instead of undercutting it. The product-framing paragraph
 * then scopes the paid transaction to this specific raffle's Access Pass
 * — a deliberate defense-in-depth layer that reframes consideration as
 * attaching to per-raffle access (entry history, receipt, host updates,
 * bonus entries) rather than to the chance of winning. The AMOE + "void
 * where prohibited" + Terms references close out in neutral secondary
 * copy — still adjacent to the CTA, still satisfying equal prominence.
 *
 * Legal framing (defense in depth):
 *
 * 1. **Reframed consideration** — per-raffle Access Pass positions the
 *    paid exchange as platform access scoped to this raffle, with entries
 *    surfaced as an included bonus. Mirrors the enforcement-tested
 *    pattern used by One Country / Omaze / Prizeo (adapted for
 *    per-raffle scope instead of platform-wide subscription). Weaker
 *    than the subscription model but still a meaningful layer alongside
 *    (2).
 * 2. **Removed consideration via AMOE** — the free Alternative Method of
 *    Entry with identical odds removes the "consideration" element for
 *    anyone who uses it. Primary defense, recognized by UK Gambling Act
 *    2005 §14 and most US state statutes.
 *
 * Together these defuse the three-element lottery test (prize + chance +
 * consideration). "Void where prohibited" + the Terms link cover
 * jurisdiction-specific carve-outs without enumerating them in the
 * checkout surface.
 *
 * Rendered as a Server Component — static legal copy, no interactivity,
 * stays out of the client bundle.
 *
 * @param props - Disclaimer props
 * @returns Disclaimer block with value-forward headline + Access Pass + AMOE + Terms refs
 */
export function AccessPassDisclaimer({
	raffleTitle,
	ticketQuantity,
}: AccessPassDisclaimerProps = {}) {
	// Trim because the backend may return whitespace-padded titles — an
	// empty trimmed string should degrade to scope-agnostic copy, not
	// render a dangling "for " phrase.
	const trimmedTitle = raffleTitle?.trim();
	const accessMonths = resolveAccessMonths(ticketQuantity);

	return (
		<div className="rounded-xl border border-[#B4B4B4] bg-[#F6F6F6] px-4 py-3 text-xs leading-relaxed text-[#4A4A4A]">
			<p className="mb-1 font-semibold text-black">
				More entries, better chances of winning.
			</p>
			<p className="mb-2">
				Your purchase is an Access Pass for{' '}
				{trimmedTitle ? (
					<>
						the following sweepstake:{' '}
						<span className="italic">{trimmedTitle}</span>
					</>
				) : (
					<>this sweepstake</>
				)}
				. It unlocks exclusive content and opportunities —{' '}
				<strong className="font-semibold text-black">
					{accessMonths}-month FREE
				</strong>{' '}
				access to a 10k+ content library with online tips &amp; tricks, host
				updates, behind-the-scenes posts, early notifications, entry history,
				payment receipt, and bonus entries into the draw.
			</p>
			<p>
				Every entry — paid or free — carries identical odds. Check{' '}
				<Link href="/free-entry" className="underline">
					/free-entry
				</Link>{' '}
				to understand how our Alternative Method of Entry works. Void where
				prohibited. See{' '}
				<Link href="/terms" className="underline">
					Terms
				</Link>
				.
			</p>
		</div>
	);
}
