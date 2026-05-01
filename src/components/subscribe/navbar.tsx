import Link from 'next/link';
import type { ReactNode } from 'react';

import { Logo } from '@/assets/logo';

interface SubscribeNavbarProps {
	readonly children: ReactNode;
	readonly topBanner?: ReactNode;
}

/**
 * Minimal marketing navbar for /subscribe.
 *
 * Figma collapses the full PublicNavbar (Browse link, mode toggle,
 * sign-in CTA) down to a single brand mark. The /subscribe page is a
 * conversion surface — every extra nav affordance is a leak away from
 * the credit-purchase CTA, so the shell stays deliberately empty.
 *
 * Structure mirrors PublicNavbar so shared consumers (marquee
 * `topBanner`, `max-w-hero` content container, `--spacing-navbar-pad`
 * horizontal gutter) keep identical layout math — sections can still
 * break out full-bleed via `-mx-(--spacing-navbar-pad)` on desktop.
 *
 * Server Component because there's no state, no auth branching, no
 * event handlers — ships zero JS for this piece of the shell.
 *
 * @param children - Page content rendered inside the max-width container
 * @param topBanner - Optional sticky banner (e.g. marquee) placed between
 *   the navbar and the content gutter
 * @returns Sticky minimal navbar + optional banner + content wrapper
 */
export function SubscribeNavbar({ children, topBanner }: SubscribeNavbarProps) {
	return (
		<>
			<nav className="bg-background border-ink-900 relative z-(--z-sticky-hi) border-b">
				<div className="max-w-hero mx-auto flex h-14 w-full items-center px-6 sm:h-16 md:px-(--spacing-navbar-pad)">
					<Link href="/" aria-label="Rafli home">
						<Logo className="h-5 w-auto sm:h-6" />
					</Link>
				</div>
			</nav>

			{topBanner}

			{/* Content wrapper intentionally omits `z-*`.
			    Nav sits at `z-(--z-sticky-hi)` and establishes its own
			    stacking context. If we give this wrapper the same z-index,
			    DOM-order tiebreak lets the wrapper's stacking tree (incl.
			    the hero decor's `-z-10` abspos bleed) paint on top of the
			    nav, obscuring the logo. Keeping the wrapper at default
			    auto z-index leaves `-z-10` resolving against the root
			    stacking context — the decor correctly tucks behind nav,
			    marquee, AND the main content flow, visible only where
			    those layers let it bleed through.
			    No `overflow-*` either, so the decor still escapes the
			    hero section boundary; only the opaque nav + marquee cap
			    the upward bleed.
			    Gutter ladder matches the navbar above it (24px mobile,
			    48px md+) so full-bleed sections that break out via
			    `-mx-(--spacing-navbar-pad)` snap to the same rail. */}
			<div className="max-w-hero relative mx-auto px-6 pb-10 md:px-(--spacing-navbar-pad)">
				{children}
			</div>
		</>
	);
}
