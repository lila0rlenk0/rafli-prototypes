import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
	title: 'Terms of Service',
	description:
		'Rafli Terms of Service — paid and free entry, refund and cancellation policy, records retention, and dispute resolution.',
};

/**
 * Terms of Service page.
 *
 * Server Component — static legal content, no interactivity.
 *
 * Content authoritatively describes the legal framework used across the
 * checkout surfaces. The primary lottery-test defense is the "No Purchase
 * Necessary" + AMOE pattern: the free Alternative Method of Entry removes
 * the "consideration" element for anyone who uses it, so paid entries do
 * not convert a raffle into an unlicensed lottery. Every consumer-facing
 * transaction the site offers is explained here so the operator intent is
 * defensible in an enforcement action — reviewers look at the public
 * Terms alongside the UI before piercing the veil.
 *
 * Shipped policies:
 * - Paid-entry product definition
 * - No-purchase-necessary AMOE reference (/free-entry)
 * - Refund policy (7-day pre-draw, no refund post-draw, subscriptions)
 * - Records retention commitment (7 years)
 * - Jurisdictional disclaimers ("void where prohibited")
 * - Dispute resolution contact
 */
export default function TermsPage() {
	return (
		<div className="container mx-auto max-w-3xl px-4 py-12">
			<header className="mb-10">
				<h1 className="font-clash-display mb-2 text-4xl font-bold sm:text-5xl">
					Terms of Service
				</h1>
				<p className="text-muted-foreground text-sm">
					Last updated: 17 April 2026
				</p>
			</header>

			<div className="space-y-8 text-sm leading-relaxed">
				<Section title="1. Agreement">
					<p>
						These Terms govern your use of the Rafli platform (the
						&quot;Platform&quot;) operated by Rafli, Inc. (&quot;Rafli&quot;,
						&quot;we&quot;, &quot;us&quot;). By creating an account, purchasing
						a paid entry, or entering any raffle hosted on the Platform by any
						method, you agree to these Terms. If you do not agree, do not use
						the Platform.
					</p>
				</Section>

				<Section title="2. What You're Purchasing">
					<p>
						When you complete a paid checkout, you purchase a specified quantity
						of entries into the associated raffle. Paid entries have no
						guaranteed outcome — every entry carries the same odds of being
						drawn, and no entrant is entitled to a prize.
					</p>
					<p className="mt-3">
						<strong>Paid entries are one of two entry paths.</strong> The other
						path, described in Section 3, is free and carries identical odds —
						no purchase is necessary to enter or win.
					</p>
				</Section>

				<Section title="3. No Purchase Necessary — Free Entry (AMOE)">
					<p>
						<strong>
							No purchase is necessary to enter or win any raffle.
						</strong>{' '}
						A free Alternative Method of Entry (AMOE) is available and carries
						identical odds of winning as any paid entry.
					</p>
					<p className="mt-3">
						The AMOE is fulfilled by a verified public share of the raffle on X
						(formerly Twitter) from the raffle detail page. Full step-by-step
						instructions are at{' '}
						<Link href="/free-entry" className="underline">
							/free-entry
						</Link>
						.
					</p>
				</Section>

				<Section title="4. Eligibility">
					<p>You may enter a raffle only if you:</p>
					<ul className="mt-2 list-inside list-disc space-y-1">
						<li>are 18 years of age or older (21 where required by law);</li>
						<li>
							are not a resident of any jurisdiction where such participation is
							prohibited;
						</li>
						<li>
							have not been employed by, or immediately related to an employee
							of, the raffle sponsor or Rafli; and
						</li>
						<li>comply with the applicable per-raffle Official Rules.</li>
					</ul>
					<p className="mt-3">
						<strong>Void where prohibited.</strong> Residents of jurisdictions
						where the raffle is not permitted are ineligible and may not enter
						by any method, paid or free.
					</p>
				</Section>

				<Section title="5. Refund &amp; Cancellation Policy">
					<ul className="list-inside list-disc space-y-2">
						<li>
							<strong>Paid entry, pre-draw:</strong> full refund available
							within 7 days of purchase provided the associated raffle draw has
							not yet occurred.
						</li>
						<li>
							<strong>Paid entry, post-draw:</strong> no refund. Entries are
							consumed when the draw executes.
						</li>
						<li>
							<strong>Subscriptions:</strong> cancel anytime with no commitment.
							Recurring entry grants continue through the end of the paid
							period. Past billing cycles are non-refundable.
						</li>
						<li>
							<strong>Raffle cancelled or voided by the host or Rafli:</strong>{' '}
							full refund of the entry price regardless of timing.
						</li>
					</ul>
				</Section>

				<Section title="6. Winner Selection">
					<p>
						Winners are selected using verifiable on-chain randomness (Chainlink
						VRF) against a sealed, public ticket manifest. Anyone can
						independently re-compute the winner from public data — see the
						Protocol Details on{' '}
						<Link href="/how-it-works" className="underline">
							How It Works
						</Link>
						. Winners must respond to prize-claim communications within 30 days
						of being notified.
					</p>
				</Section>

				<Section title="7. Prize Fulfillment">
					<p>
						Prizes are fulfilled within 30 days of winner identification and any
						required identity verification. If a winner fails identity checks,
						does not respond, or becomes otherwise ineligible, Rafli or the
						raffle host reserves the right to select an alternate winner.
					</p>
				</Section>

				<Section title="8. Records Retention">
					<p>
						We retain entry records, draw manifests, VRF proofs, winner identity
						verification documents, and payment records for{' '}
						<strong>seven (7) years</strong> from the date of the raffle,
						consistent with US tax, AML, and consumer-protection recordkeeping
						expectations. Personally identifiable information not subject to
						retention requirements is purged 30 days after account deletion.
					</p>
				</Section>

				<Section title="9. Taxes">
					<p>
						Winners are responsible for all taxes on prizes received. US winners
						of prizes with an aggregate value of $600 or more in a calendar year
						must provide a completed IRS Form W-9 prior to prize release; non-US
						winners must provide Form W-8BEN or the local equivalent. Rafli will
						issue Form 1099-MISC or equivalent tax reporting as required by law.
					</p>
				</Section>

				<Section title="10. Dispute Resolution">
					<p>
						If you believe your entry, payment, or prize was mishandled, contact
						us at{' '}
						<a href="mailto:support@rafli.win" className="underline">
							support@rafli.win
						</a>
						. Good-faith disputes unresolved after 30 days are subject to
						binding arbitration under the American Arbitration Association
						Consumer Rules. You may opt out of arbitration within 30 days of
						creating your account by written notice to the address above.
					</p>
				</Section>

				<Section title="11. Acceptable Use">
					<p>
						You agree not to: create multiple accounts to acquire additional
						entries; use automated tools to redeem AMOE entries; impersonate
						another person; exploit bugs in the Platform; or violate any
						applicable law while using the Platform.
					</p>
				</Section>

				<Section title="12. Changes">
					<p>
						We may update these Terms to reflect legal, product, or operational
						changes. Material changes are surfaced via in-app notice at least 14
						days before taking effect. Continued use after the effective date
						constitutes acceptance.
					</p>
				</Section>

				<Section title="13. Contact">
					<p>
						Rafli, Inc., a subsidiary of the EARN&apos;M Foundation. Contact:{' '}
						<a href="mailto:support@rafli.win" className="underline">
							support@rafli.win
						</a>
						.
					</p>
				</Section>
			</div>
		</div>
	);
}

interface SectionProps {
	title: string;
	children: React.ReactNode;
}

/**
 * Consistent heading + body wrapper for each Terms clause.
 * Scoped to this page — splitting each clause into its own module would
 * make the document harder to review end-to-end.
 */
function Section({ title, children }: SectionProps) {
	return (
		<section>
			<h2 className="font-clash-display mb-2 text-2xl font-semibold">
				{title}
			</h2>
			<div className="text-muted-foreground">{children}</div>
		</section>
	);
}
