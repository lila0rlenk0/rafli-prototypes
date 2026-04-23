'use client';

import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode, useState } from 'react';

import { Logo } from '@/assets/logo';
import { SignOutButton } from '@/components/auth/sign-out/button';
import { cn } from '@/lib/class-names';

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
 * Admin-specific navbar — same structure as user Navbar.
 * No mode switch, notifications, or feedback button.
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

	// startsWith handles nested routes (e.g. /admin/verification/[id])
	function isActiveLink(href: string): boolean {
		return pathname.startsWith(href);
	}

	return (
		<>
			{/* Sticky nav — same structure as user-facing Navbar */}
			<nav className="bg-background border-cool-200 sticky top-0 z-20 border-b">
				<div className="max-w-hero mx-auto flex h-14 w-full items-center justify-between px-4 sm:h-16 sm:px-25">
					{/* Left: logo + admin nav links */}
					<div className="flex items-center gap-3 sm:gap-8">
						<Link href="/admin">
							<Logo className="h-5 w-auto sm:h-6" />
						</Link>

						{/* Divider — matches user Navbar */}
						<div className="bg-cool-200 hidden h-8 w-px sm:block" />

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

				{/* Mobile menu overlay — same brand-mint as user Navbar */}
				{isMenuOpen ? (
					<div className="bg-brand-mint fixed inset-0 z-50 sm:hidden">
						<div className="border-cool-200 flex items-center justify-between border-b p-4">
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
									className="font-clash-display tracking-micro-3 text-4xl font-semibold text-black"
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
			<div className="max-w-hero mx-auto mt-6 overflow-auto px-4 pb-10 sm:mt-10 sm:px-25">
				{children}
			</div>
		</>
	);
}
