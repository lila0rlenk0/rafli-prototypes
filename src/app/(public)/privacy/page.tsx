import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
	title: 'Privacy Policy',
	description:
		'Rafli Privacy Policy — what we collect, how we use it, GDPR and CCPA rights, data retention, cookies, analytics consent.',
};

/**
 * Privacy Policy page.
 *
 * Server Component — static legal content, no interactivity.
 *
 * Covers GDPR Art. 13 notice obligations, CCPA §1798.100 right-to-know
 * disclosures, Brazil LGPD (lawful basis), and UK/EU cookie consent. The
 * cookie consent banner shipped elsewhere in this commit is the
 * operational enforcement of the "Cookies &amp; Analytics" section below,
 * so both documents must describe the same categories.
 */
export default function PrivacyPage() {
	return (
		<div className="container mx-auto max-w-3xl px-4 py-12">
			<header className="mb-10">
				<h1 className="font-clash-display mb-2 text-4xl font-bold sm:text-5xl">
					Privacy Policy
				</h1>
				<p className="text-muted-foreground text-sm">
					Last updated: 17 April 2026
				</p>
			</header>

			<div className="space-y-8 text-sm leading-relaxed">
				<Section title="1. Who We Are">
					<p>
						Rafli, Inc. (&quot;Rafli&quot;, &quot;we&quot;, &quot;us&quot;) is
						the data controller for personal information collected through the
						Rafli platform. Contact:{' '}
						<a href="mailto:privacy@rafli.win" className="underline">
							privacy@rafli.win
						</a>
						.
					</p>
				</Section>

				<Section title="2. What We Collect">
					<ul className="list-inside list-disc space-y-1">
						<li>
							<strong>Account data</strong>: name, email, avatar, authentication
							identifiers.
						</li>
						<li>
							<strong>Checkout data</strong>: paid entry purchases, payment
							method identifiers (no card numbers — Stripe holds those), promo
							codes, entry counts.
						</li>
						<li>
							<strong>Winner identity verification (KYC)</strong>: government
							ID, date of birth, address — collected only when you win a prize
							that triggers verification.
						</li>
						<li>
							<strong>On-chain identity commitment</strong>: a one-way SHA-256
							hash of your account plus raffle ID, written to IPFS. The hash
							cannot be reversed to identify you.
						</li>
						<li>
							<strong>Device &amp; usage data</strong>: IP address, browser,
							pages viewed, clicks — collected via our analytics provider and
							only with your consent (see Cookies below).
						</li>
					</ul>
				</Section>

				<Section title="3. Lawful Basis (GDPR Art. 6)">
					<ul className="list-inside list-disc space-y-1">
						<li>
							<strong>Performance of contract</strong> — processing purchase,
							entry, prize-fulfillment, and support requests.
						</li>
						<li>
							<strong>Legal obligation</strong> — tax reporting, AML/KYC,
							records retention.
						</li>
						<li>
							<strong>Legitimate interest</strong> — fraud prevention, security
							logs, service improvement.
						</li>
						<li>
							<strong>Consent</strong> — marketing emails and non-essential
							analytics cookies. You can withdraw consent at any time.
						</li>
					</ul>
				</Section>

				<Section title="4. Your Rights">
					<p>
						Subject to local law (GDPR, UK GDPR, CCPA, LGPD), you have the right
						to:
					</p>
					<ul className="mt-2 list-inside list-disc space-y-1">
						<li>access the personal data we hold about you;</li>
						<li>request correction or deletion;</li>
						<li>restrict or object to processing;</li>
						<li>
							portability — receive your data in a machine-readable format;
						</li>
						<li>
							withdraw consent for marketing or analytics without affecting past
							processing;
						</li>
						<li>
							lodge a complaint with your local data protection authority.
						</li>
					</ul>
					<p className="mt-3">
						Submit requests to{' '}
						<a href="mailto:privacy@rafli.win" className="underline">
							privacy@rafli.win
						</a>
						. We respond within 30 days.
					</p>
				</Section>

				<Section title="5. Cookies &amp; Analytics">
					<p>
						The first time you visit Rafli, you will see a cookie consent
						banner. Essential cookies (authentication, session, mode preference)
						are required to run the service and are set without consent.
						Analytics and marketing cookies are set only after you accept.
					</p>
					<p className="mt-3">
						We use Mixpanel for product analytics. Mixpanel receives page views,
						clicks, and a hashed user identifier — never raw personal data from
						form fields. You can reject analytics cookies at any time by
						clearing browser storage or revoking consent on request.
					</p>
				</Section>

				<Section title="6. Sharing">
					<p>
						We share data only with: (a) infrastructure and payment processors
						who run Rafli (Stripe, Vercel, Sentry, Mixpanel); (b) raffle hosts
						to enable prize fulfillment to winners; (c) government agencies
						where legally compelled. We do not sell personal data.
					</p>
				</Section>

				<Section title="7. Retention">
					<p>
						Entry records, draw manifests, VRF proofs, winner KYC, and tax forms
						are retained for 7 years — the longest applicable statutory minimum.
						Account profile data is purged 30 days after account deletion.
						Identity commitments on IPFS are not deletable by design (they are
						the public verification signal) but contain no personal data by
						construction.
					</p>
				</Section>

				<Section title="8. International Transfers">
					<p>
						Rafli is operated from the United States. If you access the Platform
						from the EEA, UK, Switzerland, or another region with data-transfer
						restrictions, your data is transferred under Standard Contractual
						Clauses (EU 2021/914) or their UK addendum equivalent.
					</p>
				</Section>

				<Section title="9. Children">
					<p>
						Rafli is not intended for users under 18 and we do not knowingly
						collect data from them. If you believe a child has provided data,
						contact{' '}
						<a href="mailto:privacy@rafli.win" className="underline">
							privacy@rafli.win
						</a>{' '}
						and we will delete it.
					</p>
				</Section>

				<Section title="10. Changes">
					<p>
						Material changes to this policy are surfaced in-app at least 14 days
						before taking effect. See{' '}
						<Link href="/terms" className="underline">
							Terms
						</Link>{' '}
						for the full agreement.
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
 * Consistent heading + body wrapper for each policy clause.
 * Scoped to this page for readability — mirrors the /terms structure.
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
