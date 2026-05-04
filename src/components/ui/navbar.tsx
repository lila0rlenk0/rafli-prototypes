'use client';

import { Menu, User, X } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useEffect, useState } from 'react';

import { Logo } from '@/assets/logo';
import { ChatNavLink } from '@/components/messages/chat/nav-link';
import { ModeSwitchToggle } from '@/components/mode/switch-toggle';
import { NotificationBell } from '@/components/notifications/bell';
import { SubscriptionPill } from '@/components/ui-custom/subscription-pill';
import { FEATURE_FLAGS } from '@/lib/feature-flags';
import { cn } from '@/lib/class-names';

const FEEDBACK_FORM_URL = 'https://forms.gle/pE38Fv2JxfSuPZjK6';

interface NavbarProps {
	children: ReactNode;
}

/**
 * Protected navbar component with responsive hamburger menu
 */
export function Navbar({ children }: NavbarProps) {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [isScrolled, setIsScrolled] = useState(false);

	useEffect(function watchScroll() {
		function handleScroll() {
			setIsScrolled(window.scrollY > 10);
		}

		handleScroll();
		window.addEventListener('scroll', handleScroll, { passive: true });
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

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
			<nav
				className={cn(
					'sticky top-0 z-20 border-b border-black transition-[background-color] duration-500 ease-in-out',
					isScrolled ? 'bg-background' : 'bg-transparent',
				)}
			>
				<div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between px-4 sm:h-16 sm:px-[100px]">
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
							My Sweepstakes
						</Link>
					</div>

					{/* Desktop: Right side icons */}
					<div className="hidden items-center gap-4 sm:flex">
						<SubscriptionPill />
						<a
							href={FEEDBACK_FORM_URL}
							target="_blank"
							rel="noopener noreferrer"
							data-testid="help-us-improve-button"
							className="flex h-[38px] items-center rounded-full border border-black px-4 text-sm font-medium text-black"
						>
							Help us improve
						</a>
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
					</div>

					{/* Mobile: Chat + Notification bell + Hamburger menu */}
					<div className="flex items-center gap-2 sm:hidden">
						<ChatNavLink />
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
							<ModeSwitchToggle />
							{/* Bubble click closes mobile overlay on badge tap */}
							<div onClick={closeMenu} role="presentation">
								<SubscriptionPill />
							</div>

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
								My Sweepstakes
							</Link>
							{FEATURE_FLAGS.CHAT_ENABLED ? (
								<Link
									href="/messages"
									className="font-clash-display text-4xl font-semibold tracking-[0.18px] text-black"
									onClick={closeMenu}
								>
									Messages
								</Link>
							) : null}
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
								className="flex h-[38px] items-center justify-center rounded-full border border-black px-4 text-sm font-medium text-black"
							>
								Help us improve
							</a>
						</div>
					</div>
				) : null}
			</nav>

			<div className="mx-auto mt-6 max-w-[1440px] overflow-x-hidden px-4 pb-10 sm:mt-10 sm:px-[100px]">
				{children}
			</div>
		</>
	);
}
