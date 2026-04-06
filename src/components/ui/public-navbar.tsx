'use client';

import { Menu, User, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { Logo } from '@/assets/logo';
import { ModeSwitchToggle } from '@/components/mode/mode-switch-toggle';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { Button } from '@/components/ui/button';

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

	return (
		<>
			{/* Background strip — solid bg, z-10 so decorative shapes (z-[15]) show above */}
			<div className="bg-background sticky top-0 z-10 h-14 sm:h-16" />

			<nav className="bg-background sticky top-0 z-20 -mt-14 border-b border-black sm:-mt-16">
				<div className="mx-auto flex h-14 w-full max-w-[1920px] items-center justify-between px-3 sm:h-16 sm:px-8 2xl:px-[90px]">
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

						{isAuthenticated && (
							<Link
								href="/my-raffles"
								className="hidden text-sm font-semibold sm:block"
							>
								My Raffles
							</Link>
						)}
					</div>

					{/* Desktop: Right side */}
					<div className="hidden items-center gap-3 sm:flex sm:gap-8">
						<a
							href={FEEDBACK_FORM_URL}
							target="_blank"
							rel="noopener noreferrer"
							className="rounded-full border border-black px-4 py-2 text-sm font-medium text-black"
						>
							Help us improve
						</a>
						{isAuthenticated ? (
							<>
								<div className="w-56">
									<ModeSwitchToggle />
								</div>
								<NotificationBell />
								<Link href="/profile">
									<User className="size-5" />
								</Link>
							</>
						) : (
							<Button asChild className="h-9 px-4 text-sm sm:h-10 sm:px-6">
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
				{isMenuOpen && (
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
							{isAuthenticated && <ModeSwitchToggle />}

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
										My raffles
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
								<Button
									asChild
									className="bg-dark hover:bg-dark/90 mt-4 h-14 text-lg"
								>
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
								className="flex h-14 items-center justify-center rounded-full border border-black text-lg font-semibold text-black"
							>
								Help us improve
							</a>
						</div>
					</div>
				)}
			</nav>

			{topBanner}

			<div className="relative z-[16] mx-auto mt-6 max-w-[1920px] overflow-auto px-3 pb-10 sm:mt-10 sm:px-8 2xl:px-[90px]">
				{children}
			</div>
		</>
	);
}
