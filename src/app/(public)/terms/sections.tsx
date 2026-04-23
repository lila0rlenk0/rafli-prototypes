import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Terms-of-service clause — plain-text body renderers covering the
 * paid-entry product definition, AMOE pattern, refund policy, winner
 * selection, records retention, taxes, dispute resolution, and
 * acceptable use. Split out so the page shell stays focused on the
 * heading + map and copy edits avoid JSX churn.
 */
export interface TermsSection {
	title: string;
	body: ReactNode;
}

export const TERMS_SECTIONS: ReadonlyArray<TermsSection> = [
	{
		title: '1. Agreement',
		body: (
			<p>
				These Terms govern your use of the Rafli platform (the
				&quot;Platform&quot;) operated by Rafli, Inc. (&quot;Rafli&quot;,
				&quot;we&quot;, &quot;us&quot;). By creating an account, purchasing a
				paid entry, or entering any sweepstakes hosted on the Platform by any
				method, you agree to these Terms. If you do not agree, do not use the
				Platform.
			</p>
		),
	},
	{
		title: "2. What You're Purchasing",
		body: (
			<>
				<p>
					When you complete a paid checkout, you purchase a specified quantity
					of entries into the associated sweepstakes. Paid entries have no
					guaranteed outcome — every entry carries the same odds of being drawn,
					and no entrant is entitled to a prize.
				</p>
				<p className="mt-3">
					<strong>Paid entries are one of two entry paths.</strong> The other
					path, described in Section 3, is free and carries identical odds — no
					purchase is necessary to enter or win.
				</p>
			</>
		),
	},
	{
		title: '3. No Purchase Necessary — Free Entry (AMOE)',
		body: (
			<>
				<p>
					<strong>
						No purchase is necessary to enter or win any sweepstakes.
					</strong>{' '}
					A free Alternative Method of Entry (AMOE) is available and carries
					identical odds of winning to any paid entry.
				</p>
				<p className="mt-3">
					The AMOE is fulfilled by a verified public share of the sweepstakes on
					X (formerly Twitter) from the sweepstakes detail page. Full
					step-by-step instructions are at{' '}
					<Link href="/free-entry" className="underline">
						/free-entry
					</Link>
					.
				</p>
			</>
		),
	},
	{
		title: '4. Eligibility',
		body: (
			<>
				<p>You may enter a sweepstakes only if you:</p>
				<ul className="mt-2 flex list-inside list-disc flex-col gap-1">
					<li>are 18 years of age or older (21 where required by law);</li>
					<li>
						are not a resident of any jurisdiction where such participation is
						prohibited;
					</li>
					<li>
						have not been employed by, or immediately related to an employee of,
						the sweepstakes sponsor or Rafli; and
					</li>
					<li>comply with the applicable per-sweepstakes Official Rules.</li>
				</ul>
				<p className="mt-3">
					<strong>Void where prohibited.</strong> Residents of jurisdictions
					where the sweepstakes is not permitted are ineligible and may not
					enter by any method, paid or free.
				</p>
			</>
		),
	},
	{
		title: '5. Refund & Cancellation Policy',
		body: (
			<ul className="flex list-inside list-disc flex-col gap-2">
				<li>
					<strong>Paid entry, pre-draw:</strong> full refund available within 7
					days of purchase provided the associated sweepstakes draw has not yet
					occurred.
				</li>
				<li>
					<strong>Paid entry, post-draw:</strong> no refund. Entries are
					consumed when the draw executes.
				</li>
				<li>
					<strong>Subscriptions:</strong> cancel anytime with no commitment.
					Recurring entry grants continue through the end of the paid period.
					Past billing cycles are non-refundable.
				</li>
				<li>
					<strong>Sweepstakes cancelled or voided by the host or Rafli:</strong>{' '}
					full refund of the entry price regardless of timing.
				</li>
			</ul>
		),
	},
	{
		title: '6. Winner Selection',
		body: (
			<p>
				Winners are selected using verifiable on-chain randomness (Chainlink
				VRF) against a sealed, public entry manifest. Anyone can independently
				re-compute the winner from public data — see the Protocol Details on{' '}
				<Link href="/how-it-works" className="underline">
					How It Works
				</Link>
				. Winners must respond to prize-claim communications within 30 days of
				being notified.
			</p>
		),
	},
	{
		title: '7. Prize Fulfillment',
		body: (
			<p>
				Prizes are fulfilled within 30 days of winner identification and any
				required identity verification. If a winner fails identity checks, does
				not respond, or becomes otherwise ineligible, Rafli or the sweepstakes
				host reserves the right to select an alternate winner.
			</p>
		),
	},
	{
		title: '8. Records Retention',
		body: (
			<p>
				We retain entry records, draw manifests, VRF proofs, winner identity
				verification documents, and payment records for{' '}
				<strong>seven (7) years</strong> from the date of the sweepstakes,
				consistent with US tax, AML, and consumer-protection recordkeeping
				expectations. Personally identifiable information not subject to
				retention requirements is purged 30 days after account deletion.
			</p>
		),
	},
	{
		title: '9. Taxes',
		body: (
			<p>
				Winners are responsible for all taxes on prizes received. US winners of
				prizes with an aggregate value of $600 or more in a calendar year must
				provide a completed IRS Form W-9 prior to prize release; non-US winners
				must provide Form W-8BEN or the local equivalent. Rafli will issue Form
				1099-MISC or equivalent tax reporting as required by law.
			</p>
		),
	},
	{
		title: '10. Dispute Resolution',
		body: (
			<p>
				If you believe your entry, payment, or prize was mishandled, contact us
				at{' '}
				<a href="mailto:hello@earnm.com" className="underline">
					hello@earnm.com
				</a>
				. Good-faith disputes unresolved after 30 days are subject to binding
				arbitration under the American Arbitration Association Consumer Rules.
				You may opt out of arbitration within 30 days of creating your account
				by written notice to the address above.
			</p>
		),
	},
	{
		title: '11. Acceptable Use',
		body: (
			<p>
				You agree not to: create multiple accounts to acquire additional
				entries; use automated tools to redeem AMOE entries; impersonate another
				person; exploit bugs in the Platform; or violate any applicable law
				while using the Platform.
			</p>
		),
	},
	{
		title: '12. Changes',
		body: (
			<p>
				We may update these Terms to reflect legal, product, or operational
				changes. Material changes are surfaced via in-app notice at least 14
				days before taking effect. Continued use after the effective date
				constitutes acceptance.
			</p>
		),
	},
	{
		title: '13. Contact',
		body: (
			<p>
				Rafli, Inc., a subsidiary of the EARN&apos;M Foundation. Contact:{' '}
				<a href="mailto:hello@earnm.com" className="underline">
					hello@earnm.com
				</a>
				.
			</p>
		),
	},
];
