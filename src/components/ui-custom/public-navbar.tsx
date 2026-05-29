'use client';

import { Menu, User, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { Logo } from '@/assets/logo';
import { ChatNavLink } from '@/components/messages/chat/nav-link';
import { ModeSwitchToggle } from '@/components/mode/switch-toggle';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/notifications/bell';
import { SubscriptionPill } from '@/components/ui-custom/subscription-pill';

const FEEDBACK_FORM_URL = 'https://forms.gle/pE38Fv2JxfSuPZjK6';

interface PublicNavbarProps {
	children: ReactNode;
	isAuthenticated: boolean;
	topBanner?: ReactNode;
}

/**
 * PublicNavbar Component
 *
 * Auth-aware navigation component for public browse pages.
 * Shows different navigation options based on authentication status:
 * - Authenticated: Browse, My Raffles, Mode Switch, Profile
 * - Non-authenticated: Browse, Sign In button
 *
 * @param children - Child components to render in the content area
 * @param isAuthenticated - Whether the user is currently authenticated
 */
export function PublicNavbar({
	children,
	isAuthenticated,
	topBanner,
}: PublicNavbarProps) {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const pathname = usePathname();
	const searchParams = useSearchParams();

	/**
	 * Builds the sign-in URL with returnTo preserving current page
	 */
	function getSignInHref(): string {
		const returnTo = searchParams.toString()
			? `${pathname}?${searchParams.toString()}`
			: pathname;
		return `/sign-in?returnTo=${encodeURIComponent(returnTo)}`;
	}

	/**
	 * Toggles the mobile menu open/closed state
	 */
	function toggleMenu() {
		setIsMenuOpen(prev => !prev);
	}

	/**
	 * Closes the mobile menu
	 */
	function closeMenu() {
		setIsMenuOpen(false);
	}

	/**
	 * Returns the top spacing for the content container.
	 *
	 * Why: pages with a top banner (e.g. marquee) need content to start
	 * immediately below that banner. Pages without a banner keep the legacy
	 * breathing room under the navbar.
	 */
	function getContentTopSpacingClassName(): string {
		if (topBanner) {
			return 'mt-0';
		}
		return 'mt-6 sm:mt-10';
	}

	return (
		<>
			{/* Background strip — solid bg, z-10 so decorative shapes (z-(--z-sticky)) show above */}
			<div className="bg-background sticky top-0 z-10 h-14 sm:h-16" />

			<nav className="bg-background sticky top-0 z-20 -mt-14 border-b border-black sm:-mt-16">
				<div className="max-w-hero mx-auto flex h-14 w-full items-center justify-between px-3 sm:h-16 sm:px-[100px]">
					<div className="flex items-center gap-3 sm:gap-8">
						<Link href="/browse">
							<Logo className="h-5 w-auto sm:h-6" />
						</Link>

						<div className="hidden h-8 w-px bg-[#E6E8EC] sm:block" />

						<Link
							href="/browse"
							className="hidden text-sm font-semibold sm:block"
						>
							Browse
						</Link>

						{isAuthenticated ? (
							<Link
								href="/my-raffles"
								className="hidden text-sm font-semibold sm:block"
							>
								My Sweepstakes
							</Link>
						) : null}
					</div>

					{/* Desktop: Right side */}
					<div className="hidden items-center gap-4 sm:flex">
						{/* Single merged pill (tier | credit) per Figma navbar spec —
						    fuses what used to be two adjacent badges into one rounded
						    silhouette split by a vertical divider. Hidden for guests:
						    the underlying `useMySubscription` call hits an authenticated
						    endpoint and would fail outright with no session. Guests
						    instead see the "Sign In" CTA in the right cluster. */}
						{isAuthenticated ? <SubscriptionPill /> : null}
						<a
							href={FEEDBACK_FORM_URL}
							target="_blank"
							rel="noopener noreferrer"
							className="flex h-[38px] items-center rounded-full border border-black px-4 text-sm font-medium text-black"
						>
							Help us improve
						</a>
						{isAuthenticated ? (
							<>
								<div className="w-56">
									<ModeSwitchToggle />
								</div>
								<div className="flex items-center gap-4">
									<ChatNavLink />
									<NotificationBell />
									<Link href="/profile">
										<User className="size-5" />
									</Link>
								</div>
							</>
						) : (
							<Button asChild>
								<Link href={getSignInHref()}>Sign In</Link>
							</Button>
						)}
					</div>

					{/* Mobile: Hamburger menu button */}
					<button
						onClick={toggleMenu}
						className="flex size-10 items-center justify-center sm:hidden"
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

				{/* Mobile menu overlay */}
				{isMenuOpen ? (
					<div className="fixed inset-0 z-50 bg-[#beffdb] sm:hidden">
						<div className="flex items-center justify-between border-b border-black px-4 py-4">
							<Link href="/browse" onClick={closeMenu}>
								<Logo className="h-5 w-auto" />
							</Link>
							<button
								onClick={closeMenu}
								className="flex size-10 items-center justify-center"
								aria-label="Close menu"
							>
								<X className="size-6" />
							</button>
						</div>

						<div className="flex flex-col gap-8 px-6 pt-8">
							{isAuthenticated ? <ModeSwitchToggle /> : null}
							{/* Bubble click closes mobile overlay on badge tap. Both
							    pills share the same wrapper pattern — same reason,
							    same closeMenu behaviour, no visual divider between
							    them so they read as a paired identity row. */}
							{isAuthenticated ? (
								<div
									onClick={closeMenu}
									role="presentation"
									className="flex flex-wrap items-center gap-3"
								>
									<SubscriptionPill />
								</div>
							) : null}

							<Link
								href="/browse"
								className="font-clash-display text-4xl font-semibold tracking-[0.18px] text-black"
								onClick={closeMenu}
							>
								Browse
							</Link>

							{isAuthenticated ? (
								<>
									<Link
										href="/my-raffles"
										className="font-clash-display text-4xl font-semibold tracking-[0.18px] text-black"
										onClick={closeMenu}
									>
										My Sweepstakes
									</Link>
									<Link
										href="/messages"
										className="font-clash-display text-4xl font-semibold tracking-[0.18px] text-black"
										onClick={closeMenu}
									>
										Messages
									</Link>
									<Link
										href="/profile/notifications"
										className="font-clash-display text-4xl font-semibold tracking-[0.18px] text-black"
										onClick={closeMenu}
									>
										Notifications
									</Link>
									<Link
										href="/profile"
										className="font-clash-display text-4xl font-semibold tracking-[0.18px] text-black"
										onClick={closeMenu}
									>
										Profile
									</Link>
								</>
							) : (
								<Button asChild size="lg" className="mt-4">
									<Link href={getSignInHref()} onClick={closeMenu}>
										Sign In
									</Link>
								</Button>
							)}

							<a
								href={FEEDBACK_FORM_URL}
								target="_blank"
								rel="noopener noreferrer"
								onClick={closeMenu}
								className="flex h-[38px] items-center justify-center rounded-full border border-black px-4 text-sm font-medium text-black"
							>
								Help us improve
							</a>
						</div>
					</div>
				) : null}
			</nav>

			{topBanner}

			<div
				className={`relative z-(--z-sticky-hi) mx-auto ${getContentTopSpacingClassName()} max-w-hero overflow-auto px-3 pb-10 sm:px-[100px]`}
			>
				{children}
			</div>
		</>
	);
}
