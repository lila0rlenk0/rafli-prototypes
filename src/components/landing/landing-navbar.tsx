'use client';

import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Logo } from '@/assets/logo';
import { Button } from '@/components/ui/button';

const FEEDBACK_FORM_URL = 'https://forms.gle/pE38Fv2JxfSuPZjK6';

interface NavLink {
	readonly label: string;
	readonly href: string;
}

// In-page anchors mirror the section IDs rendered by the landing page:
//   `#sweepstakes` → LiveRafflesSection (set via the wrapping <section id>)
//   `#how-it-works` → HowItWorksSection
//   `#faq`          → SocialProofFaqSection
// Smooth scrolling comes from the browser's default behaviour on anchor
// links — no custom scrollIntoView wiring required.
const NAV_LINKS: readonly NavLink[] = [
	{ label: 'Active sweepstakes', href: '#sweepstakes' },
	{ label: 'How it works', href: '#how-it-works' },
	{ label: 'Questions', href: '#faq' },
];

/**
 * Marketing navbar for the (landing) route group.
 *
 * 'use client' — `useState` drives the mobile-menu overlay. The rest of the
 * tree is static markup so the hydration payload stays tiny.
 *
 * Deliberately auth-unaware: this nav never renders mode toggles, the
 * notification bell, the chat link, or the subscription pill. Those are
 * /browse chrome (`PublicNavbar`) and would conflict with the marketing
 * copy ("Sign up free", "Win real prizes.") that targets a guest visitor.
 * Both CTAs deep-link into the app — `/browse` accepts authenticated and
 * guest sessions alike, so an existing user clicking "Explore sweepstakes"
 * still lands on the right surface without forcing a sign-in detour.
 *
 * Layout:
 *  - `sticky top-0` so the nav stays pinned while marketing sections scroll,
 *    matching the inspiration handoff and /browse's chrome rhythm.
 *  - 3 in-page anchors hidden below `md:` — under that breakpoint they live
 *    inside the hamburger overlay to free up the row for the CTA cluster.
 *  - "Help us improve" hidden below `sm:` to keep the CTA pair from
 *    crowding the logo on the smallest viewports.
 *
 * @returns Sticky marketing nav with anchor links + dual CTAs + mobile menu
 */
export function LandingNavbar() {
	const [isMenuOpen, setIsMenuOpen] = useState(false);

	function toggleMenu() {
		setIsMenuOpen(prev => !prev);
	}

	function closeMenu() {
		setIsMenuOpen(false);
	}

	return (
		<>
			<nav className="bg-background border-brand-dark sticky top-0 z-(--z-sticky-hi) w-full border-b">
				<div className="max-w-hero mx-auto flex h-14 w-full items-center gap-6 px-4 sm:h-16 sm:px-12">
					<Link href="/" aria-label="Rafli home" className="flex-shrink-0">
						<Logo className="h-5 w-auto sm:h-6" />
					</Link>

					<div className="hidden flex-1 items-center gap-7 md:flex">
						{NAV_LINKS.map(link => (
							<Link
								key={link.href}
								href={link.href}
								className="text-ink-900 text-sm font-medium transition-opacity hover:opacity-70"
							>
								{link.label}
							</Link>
						))}
					</div>

					<div className="hidden flex-shrink-0 items-center gap-2 md:ml-auto md:flex">
						<Button
							asChild
							variant="outline"
							size="sm"
							className="hidden h-9 px-4 text-sm sm:inline-flex"
						>
							<a
								href={FEEDBACK_FORM_URL}
								target="_blank"
								rel="noopener noreferrer"
							>
								Help us improve
							</a>
						</Button>
						<Button asChild size="sm" className="h-9 px-4 text-sm">
							<Link href="/browse">Explore sweepstakes</Link>
						</Button>
					</div>

					<button
						type="button"
						onClick={toggleMenu}
						className="ml-auto flex size-10 items-center justify-center md:hidden"
						aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
						aria-expanded={isMenuOpen}
					>
						{isMenuOpen ? (
							<X className="size-6" />
						) : (
							<Menu className="size-6" />
						)}
					</button>
				</div>
			</nav>

			{isMenuOpen ? (
				<div className="bg-background fixed inset-0 z-(--z-toast) md:hidden">
					<div className="border-brand-dark flex items-center justify-between border-b p-4">
						<Link href="/" aria-label="Rafli home" onClick={closeMenu}>
							<Logo className="h-5 w-auto" />
						</Link>
						<button
							type="button"
							onClick={closeMenu}
							className="flex size-10 items-center justify-center"
							aria-label="Close menu"
						>
							<X className="size-6" />
						</button>
					</div>

					<div className="flex flex-col gap-8 px-6 pt-8">
						{NAV_LINKS.map(link => (
							<Link
								key={link.href}
								href={link.href}
								onClick={closeMenu}
								className="font-clash-display tracking-micro-3 text-ink-900 text-3xl font-semibold"
							>
								{link.label}
							</Link>
						))}

						<div className="mt-4 flex flex-col gap-3">
							<Button asChild className="h-11 self-start px-6">
								<Link href="/browse" onClick={closeMenu}>
									Explore sweepstakes
								</Link>
							</Button>
							<Button
								asChild
								variant="outline"
								className="h-11 self-start px-6"
							>
								<a
									href={FEEDBACK_FORM_URL}
									target="_blank"
									rel="noopener noreferrer"
									onClick={closeMenu}
								>
									Help us improve
								</a>
							</Button>
						</div>
					</div>
				</div>
			) : null}
		</>
	);
}
