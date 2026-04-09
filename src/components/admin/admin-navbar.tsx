'use client';

import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode, useState } from 'react';

import { Logo } from '@/assets/logo';
import { SignOutButton } from '@/components/auth/sign-out-button';
import { cn } from '@/lib/utils';

/**
 * Admin navigation links.
 * Extensible — add entries here as new admin sections are built.
 */
const ADMIN_NAV_LINKS = [
	{ href: '/admin/verification', label: 'KYC Reviews' },
] as const;

interface AdminNavbarProps {
	children: ReactNode;
}

/**
 * Admin-specific navbar matching the existing Navbar structure exactly.
 * Same sticky positioning, same spacing, same responsive breakpoints.
 * Simplified: no mode switch, no notifications, no feedback button.
 *
 * @returns Admin navbar wrapping page content
 */
export function AdminNavbar({ children }: AdminNavbarProps) {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const pathname = usePathname();

	function toggleMenu() {
		setIsMenuOpen(prev => !prev);
	}

	function closeMenu() {
		setIsMenuOpen(false);
	}

	/**
	 * Checks if a nav link is active based on current pathname.
	 * Uses startsWith for nested routes (e.g. /admin/verification/[id]).
	 */
	function isActiveLink(href: string): boolean {
		return pathname.startsWith(href);
	}

	return (
		<>
			{/* Sticky nav — same structure as user-facing Navbar */}
			<nav className="bg-background sticky top-0 z-20 border-b border-[#e6e8ec]">
				<div className="mx-auto flex h-14 w-full max-w-[1920px] items-center justify-between px-4 sm:h-16 sm:px-6 2xl:px-20">
					{/* Left: logo + admin nav links */}
					<div className="flex items-center gap-3 sm:gap-8">
						<Link href="/admin">
							<Logo className="h-5 w-auto sm:h-6" />
						</Link>

						{/* Divider — matches user Navbar */}
						<div className="hidden h-8 w-px bg-[#E6E8EC] sm:block" />

						{/* "Admin" label to distinguish from user-facing app */}
						<span className="hidden text-xs font-semibold tracking-wider text-gray-400 uppercase sm:block">
							Admin
						</span>

						{ADMIN_NAV_LINKS.map(function renderNavLink(link) {
							const active = isActiveLink(link.href);
							return (
								<Link
									key={link.href}
									href={link.href}
									aria-current={active ? 'page' : undefined}
									className={cn(
										'hidden text-sm font-semibold sm:block',
										active && 'underline underline-offset-4',
									)}
								>
									{link.label}
								</Link>
							);
						})}
					</div>

					{/* Desktop: sign out */}
					<div className="hidden items-center sm:flex">
						<SignOutButton variant="ghost" />
					</div>

					{/* Mobile: hamburger */}
					<div className="flex items-center gap-2 sm:hidden">
						<button
							onClick={toggleMenu}
							className="flex size-10 items-center justify-center"
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
				</div>

				{/* Mobile menu overlay — same accent-green as user Navbar */}
				{isMenuOpen ? (
					<div className="fixed inset-0 z-50 bg-[#beffdb] sm:hidden">
						<div className="flex items-center justify-between border-b border-[#e6e8ec] px-4 py-4">
							<Link href="/admin" onClick={closeMenu}>
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
							{ADMIN_NAV_LINKS.map(link => (
								<Link
									key={link.href}
									href={link.href}
									className="font-clash-display text-4xl font-semibold tracking-[0.18px] text-black"
									onClick={closeMenu}
								>
									{link.label}
								</Link>
							))}

							<SignOutButton variant="outline" className="mt-4" />
						</div>
					</div>
				) : null}
			</nav>

			{/* Content wrapper — same spacing as user Navbar */}
			<div className="mx-auto mt-6 max-w-[1920px] overflow-auto px-4 pb-10 sm:mt-10 sm:px-6 2xl:px-20">
				{children}
			</div>
		</>
	);
}
