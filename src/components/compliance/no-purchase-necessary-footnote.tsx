import Link from 'next/link';

/**
 * One-liner footnote rendered under every user-facing price display.
 *
 * Kept intentionally minimal — the full disclaimer lives in
 * `AccessPassDisclaimer` above the CTA. This footnote exists so every
 * monetary figure on the page has an adjacent reference to the free
 * method, satisfying the "equal prominence" test courts apply when
 * piercing sweepstakes structures (paid entries must not be the only
 * prominent entry path).
 *
 * Server Component — static legal copy only.
 *
 * @returns Inline footnote with free-entry + void-where-prohibited callouts
 */
export function NoPurchaseNecessaryFootnote() {
	return (
		<p className="text-3xs/tight text-ink-500 text-center whitespace-nowrap">
			No purchase necessary.{' '}
			<Link href="/free-entry" className="underline">
				Free entry available
			</Link>
			. Void where prohibited.
		</p>
	);
}
