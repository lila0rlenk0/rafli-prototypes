import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Privacy policy section — plain-text body renderers that cover GDPR
 * Art. 13, CCPA §1798.100, LGPD, and UK/EU cookie consent disclosures.
 * Split out so the page shell is purely composition and legal copy can
 * be edited without touching JSX plumbing.
 */
export interface PrivacySection {
	title: string;
	body: ReactNode;
}

export const PRIVACY_SECTIONS: ReadonlyArray<PrivacySection> = [
	{
		title: '1. Who We Are',
		body: (
			<p>
				Rafli, Inc. (&quot;Rafli&quot;, &quot;we&quot;, &quot;us&quot;) is the
				data controller for personal information collected through the Rafli
				platform. Contact:{' '}
				<a href="mailto:hello@earnm.com" className="underline">
					hello@earnm.com
				</a>
				.
			</p>
		),
	},
	{
		title: '2. What We Collect',
		body: (
			<ul className="flex list-inside list-disc flex-col gap-1">
				<li>
					<strong>Account data</strong>: name, email, avatar, authentication
					identifiers.
				</li>
				<li>
					<strong>Checkout data</strong>: paid entry purchases, payment method
					identifiers (no card numbers — Stripe holds those), promo codes, entry
					counts.
				</li>
				<li>
					<strong>Winner identity verification (KYC)</strong>: government ID,
					date of birth, address — collected only when you win a prize that
					triggers verification.
				</li>
				<li>
					<strong>On-chain identity commitment</strong>: a one-way SHA-256 hash
					of your account plus sweepstakes ID, written to IPFS. The hash cannot
					be reversed to identify you.
				</li>
				<li>
					<strong>Device &amp; usage data</strong>: IP address, browser, pages
					viewed, clicks — collected via our analytics provider and only with
					your consent (see Cookies below).
				</li>
			</ul>
		),
	},
	{
		title: '3. Lawful Basis (GDPR Art. 6)',
		body: (
			<ul className="flex list-inside list-disc flex-col gap-1">
				<li>
					<strong>Performance of contract</strong> — processing purchase, entry,
					prize-fulfillment, and support requests.
				</li>
				<li>
					<strong>Legal obligation</strong> — tax reporting, AML/KYC, records
					retention.
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
		),
	},
	{
		title: '4. Your Rights',
		body: (
			<>
				<p>
					Subject to local law (GDPR, UK GDPR, CCPA, LGPD), you have the right
					to:
				</p>
				<ul className="mt-2 flex list-inside list-disc flex-col gap-1">
					<li>access the personal data we hold about you;</li>
					<li>request correction or deletion;</li>
					<li>restrict or object to processing;</li>
					<li>portability — receive your data in a machine-readable format;</li>
					<li>
						withdraw consent for marketing or analytics without affecting past
						processing;
					</li>
					<li>lodge a complaint with your local data protection authority.</li>
				</ul>
				<p className="mt-3">
					Submit requests to{' '}
					<a href="mailto:hello@earnm.com" className="underline">
						hello@earnm.com
					</a>
					. We respond within 30 days.
				</p>
			</>
		),
	},
	{
		title: '5. Cookies & Analytics',
		body: (
			<>
				<p>
					The first time you visit Rafli, you will see a cookie consent banner.
					Essential cookies (authentication, session, mode preference) are
					required to run the service and are set without consent. Analytics and
					marketing cookies are set only after you accept.
				</p>
				<p className="mt-3">
					When you accept, a third-party product analytics provider receives
					page views, clicks, and a hashed user identifier — never raw personal
					data from form fields. You can reject analytics cookies at any time by
					clearing browser storage or revoking consent on request.
				</p>
			</>
		),
	},
	{
		title: '6. Sharing',
		body: (
			<p>
				We share data only with: (a) infrastructure, payment, and analytics
				processors who run Rafli (including Stripe, Vercel, and Sentry); (b)
				sweepstakes hosts to enable prize fulfillment to winners; (c) government
				agencies where legally compelled. We do not sell personal data.
			</p>
		),
	},
	{
		title: '7. Retention',
		body: (
			<p>
				Entry records, draw manifests, VRF proofs, winner KYC, and tax forms are
				retained for 7 years — the longest applicable statutory minimum. Account
				profile data is purged 30 days after account deletion. Identity
				commitments on IPFS are not deletable by design (they are the public
				verification signal) but contain no personal data by construction.
			</p>
		),
	},
	{
		title: '8. International Transfers',
		body: (
			<p>
				Rafli is operated from the United States. If you access the Platform
				from the EEA, UK, Switzerland, or another region with data-transfer
				restrictions, your data is transferred under Standard Contractual
				Clauses (EU 2021/914) or their UK addendum equivalent.
			</p>
		),
	},
	{
		title: '9. Children',
		body: (
			<p>
				Rafli is not intended for users under 18 and we do not knowingly collect
				data from them. If you believe a child has provided data, contact{' '}
				<a href="mailto:hello@earnm.com" className="underline">
					hello@earnm.com
				</a>{' '}
				and we will delete it.
			</p>
		),
	},
	{
		title: '10. Changes',
		body: (
			<p>
				Material changes to this policy are surfaced in-app at least 14 days
				before taking effect. See{' '}
				<Link href="/terms" className="underline">
					Terms
				</Link>{' '}
				for the full agreement.
			</p>
		),
	},
];
