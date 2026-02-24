'use client';

import { Menu, User, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { Logo } from '@/assets/logo';
import { ModeSwitchButton } from '@/components/mode/mode-switch-button';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { Button } from '@/components/ui/button';

interface PublicNavbarProps {
	children: ReactNode;
	isAuthenticated: boolean;
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
export function PublicNavbar({ children, isAuthenticated }: PublicNavbarProps) {
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
			<nav className="sticky top-0 z-20 border-b border-[#e6e8ec] bg-white/80">
				<div className="mx-auto flex h-14 w-full max-w-[1300px] items-center justify-between px-4 sm:h-16 sm:px-6">
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
						{isAuthenticated ? (
							<>
								<ModeSwitchButton />
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
						<div className="flex items-center justify-between border-b border-[#e6e8ec] px-4 py-4">
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
										href="/notifications"
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

									<div className="mt-4">
										<ModeSwitchButton />
									</div>
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
						</div>
					</div>
				)}
			</nav>

			<div className="mx-auto mt-6 max-w-[1400px] overflow-auto px-4 pb-10 sm:mt-10 sm:px-0">
				{children}
			</div>
		</>
	);
}
