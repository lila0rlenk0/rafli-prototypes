import Link from 'next/link';

import { Logo } from '@/assets/logo';

// Free Entry link is required by US sweepstakes law (no-purchase-necessary
// route); other items are standard legal/support pointers.
const FOOTER_LINKS = [
	{ href: '/support', label: 'Support' },
	{ href: '/terms', label: 'Terms of Service' },
	{ href: '/privacy', label: 'Privacy Policy' },
	{ href: '/free-entry', label: 'Free Entry' },
] as const;

/**
 * Footer — thin bar with logo, legal/support links, and copyright.
 *
 * Server Component. Reused by the landing page and press-release page. The
 * page-closing CTA lives in {@link CTASection}; this footer is purely the
 * legal/nav strip beneath it.
 *
 * @returns Single-row footer with logo, link group, and copyright
 */
export function Footer() {
	return (
		<footer className="bg-background border-brand-dark border-t">
			<div className="max-w-wide mx-auto flex flex-wrap items-center justify-between gap-x-8 gap-y-4 px-6 py-7 lg:px-27">
				<Link
					href="/"
					aria-label="Rafli home"
					className="text-brand-dark inline-flex items-center"
				>
					<Logo />
				</Link>

				<nav
					aria-label="Footer"
					className="flex flex-wrap items-center gap-x-6 gap-y-2"
				>
					{FOOTER_LINKS.map(({ href, label }) => (
						<Link
							key={href}
							href={href}
							className="text-ink-500 hover:text-brand-dark text-body-sm font-medium transition-colors"
						>
							{label}
						</Link>
					))}
				</nav>

				<p className="text-ink-500 text-label-sm">
					© 2026 Rafli, Inc. All rights reserved.
				</p>
			</div>
		</footer>
	);
}
