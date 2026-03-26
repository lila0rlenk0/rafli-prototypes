'use client';

import { Menu, User, X } from 'lucide-react';
import Link from 'next/link';
import { ReactNode, useState } from 'react';

import { Logo } from '@/assets/logo';
import { ModeSwitchButton } from '@/components/mode/mode-switch-button';
import { ModeSwitchToggle } from '@/components/mode/mode-switch-toggle';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { Button } from '@/components/ui/button';

const FEEDBACK_FORM_URL = 'https://forms.gle/pE38Fv2JxfSuPZjK6';

interface NavbarProps {
	children: ReactNode;
}

/**
 * Protected navbar component with responsive hamburger menu
 */
export function Navbar({ children }: NavbarProps) {
	const [isMenuOpen, setIsMenuOpen] = useState(false);

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
			<nav className="bg-background sticky top-0 z-20 border-b border-[#e6e8ec]">
				<div className="mx-auto flex h-14 w-full max-w-[1920px] items-center justify-between px-4 sm:h-16 sm:px-6 2xl:px-20">
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

						<Link
							href="/my-raffles"
							className="hidden text-sm font-semibold sm:block"
						>
							My Raffles
						</Link>
					</div>

					{/* Desktop: Right side icons */}
					<div className="hidden items-center gap-3 sm:flex sm:gap-4">
						<Button
							asChild
							variant="outline"
							size="default"
							className="border-black text-black"
						>
							<a
								href={FEEDBACK_FORM_URL}
								target="_blank"
								rel="noopener noreferrer"
								data-testid="help-us-improve-button"
							>
								Help us improve
							</a>
						</Button>
						<ModeSwitchButton />
						<NotificationBell />
						<Link href="/profile">
							<User className="size-5" />
						</Link>
					</div>

					{/* Mobile: Notification bell + Hamburger menu */}
					<div className="flex items-center gap-2 sm:hidden">
						<NotificationBell />
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
							<ModeSwitchToggle />

							<Link
								href="/browse"
								className="font-clash-display text-4xl font-semibold tracking-[0.18px] text-black"
								onClick={closeMenu}
							>
								Browse
							</Link>
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

			<div className="mx-auto mt-6 max-w-[1920px] overflow-auto px-4 pb-10 sm:mt-10 sm:px-6 2xl:px-20">
				{children}
			</div>
		</>
	);
}
