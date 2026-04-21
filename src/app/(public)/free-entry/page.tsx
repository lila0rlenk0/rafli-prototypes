import type { Metadata } from 'next';

// external legal URLs — Rafli does not yet host its own Terms / Privacy; the
// free-entry page (a regulatory surface) points at EARNMax's published policies
// so users have working, durable links today. Revisit once Rafli ships its own.
const EARNM_TERMS_URL = 'https://www.earnm.com/terms';
const EARNM_PRIVACY_URL = 'https://www.earnm.com/privacy';
const SUPPORT_EMAIL = 'hello@earnm.com';

export const metadata: Metadata = {
	title: 'Free Entry — No Purchase Necessary',
	description:
		'Alternative Method of Entry (AMOE) for Rafli sweepstakes — free entry by sharing the sweepstakes on X, equal odds, no purchase required.',
};

/**
 * Free Entry (AMOE) page.
 *
 * Server Component — static informational content.
 *
 * The Alternative Method of Entry is the primary defense against the
 * three-element lottery test: the free path removes the "consideration"
 * element for anyone who uses it, so paid entries do not convert a raffle
 * into an unlicensed lottery. Every paid checkout disclaimer references
 * this page so the free path has equal prominence with paid checkout.
 * The AMOE on Rafli is the "Share on X" flow surfaced on every raffle
 * detail page — a verified public share of the raffle grants a bonus
 * entry at identical odds to paid entries. Content here describes the
 * operational steps in enough detail that a regulator verifying the AMOE
 * can reproduce the flow and receive an entry without paying.
 *
 * Required facts:
 *  - identical odds
 *  - per-person per-raffle entry cap
 *  - exact UI steps to claim
 *  - no purchase ever required
 */
export default function FreeEntryPage() {
	return (
		<div className="container mx-auto max-w-3xl px-4 py-12">
			<header className="mb-10">
				<h1 className="font-clash-display mb-2 text-4xl font-bold sm:text-5xl">
					Free Entry
				</h1>
				<p className="text-muted-foreground text-lg">
					No purchase necessary. Equal odds. Open to everyone eligible.
				</p>
			</header>

			<div className="space-y-8 text-sm leading-relaxed">
				<section className="bg-card rounded-xl border-2 border-black p-6">
					<h2 className="font-clash-display mb-3 text-2xl font-semibold">
						You never have to pay to enter
					</h2>
					<p className="text-muted-foreground">
						Every Rafli sweepstakes that accepts paid entries also accepts a
						free Alternative Method of Entry (AMOE) via a public share on X
						(formerly Twitter). Free entries have{' '}
						<strong>identical odds of winning</strong> as any paid entry. The
						free path exists so no one is ever required to spend money to
						participate.
					</p>
				</section>

				<Section title="How to enter for free — Share on X">
					<p>From any sweepstakes detail page:</p>
					<ol className="mt-3 list-inside list-decimal space-y-2">
						<li>
							Locate the{' '}
							<strong>&quot;Get Bonus Entries! Share on X&quot;</strong> button
							in the checkout card.
						</li>
						<li>
							If the sweepstakes has a check-in question, answer it correctly —
							the same gate that applies to paid entries applies to the free
							path.
						</li>
						<li>
							Click the button. Rafli opens an X compose window pre-filled with
							the sweepstakes link. Post the share publicly from your X account.
						</li>
						<li>
							Return to the sweepstakes page and click{' '}
							<strong>&quot;I shared it — Claim my bonus entry!&quot;</strong>.
							Rafli verifies the public post and credits the bonus entry to your
							account.
						</li>
					</ol>
					<p className="mt-4">
						Your entry is recorded with identical weight to any paid entry drawn
						by the same random selection process. You receive an on-screen
						confirmation and an email receipt once the entry is posted.
					</p>
				</Section>

				<Section title="Entry allowance">
					<p>
						<strong>One (1) free entry per person, per sweepstakes.</strong> The
						free-entry rate per person is calibrated so the free path is
						genuinely equivalent to the lowest paid-entry tier, not a formality.
						Automated or third-party sharing tools, shares from suspended or
						restricted accounts, deleted shares, and duplicate shares from the
						same person are rejected.
					</p>
				</Section>

				<Section title="Processing">
					<p>
						Verification is typically instant. Shares that cannot be verified
						(private account, post deleted before verification, share link
						altered) will not grant an entry; you may retry once the issue is
						corrected. Free entries must be claimed before the
						sweepstakes&apos;s end time — shares posted after the countdown ends
						cannot be credited.
					</p>
				</Section>

				<Section title="Eligibility">
					<p>You may enter the free path only if you:</p>
					<ul className="mt-2 list-inside list-disc space-y-1">
						<li>are 18 years of age or older (21 where required by law);</li>
						<li>
							are not a resident of a jurisdiction where the sweepstakes is
							prohibited;
						</li>
						<li>
							have not been employed by, or immediately related to an employee
							of, the sweepstakes sponsor or Rafli;
						</li>
						<li>
							hold a public X account in good standing (not suspended,
							shadow-banned, or restricted at the time of verification).
						</li>
					</ul>
					<p className="mt-3">
						See the per-sweepstakes Official Rules for any additional
						eligibility criteria. The same rules that govern paid entries govern
						the free path — identical eligibility, identical odds, identical
						prize.
					</p>
				</Section>

				<Section title="Privacy">
					<p>
						To verify your share we read the public post metadata (handle, post
						URL, timestamp) from X&apos;s public API. We do not read, store, or
						post on your behalf anything beyond what the share flow requires.
						See the{' '}
						<a
							href={EARNM_PRIVACY_URL}
							target="_blank"
							rel="noopener noreferrer"
							className="underline"
						>
							EARNMax Privacy Policy
						</a>
						.
					</p>
				</Section>

				<Section title="Questions">
					<p>
						Email{' '}
						<a href={`mailto:${SUPPORT_EMAIL}`} className="underline">
							{SUPPORT_EMAIL}
						</a>{' '}
						or see the{' '}
						<a
							href={EARNM_TERMS_URL}
							target="_blank"
							rel="noopener noreferrer"
							className="underline"
						>
							EARNMax Terms of Service
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
 * Consistent section wrapper — mirrors the /terms and /privacy layout so
 * the three compliance pages feel like a single document set to users
 * (and regulators) scanning them back to back.
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
