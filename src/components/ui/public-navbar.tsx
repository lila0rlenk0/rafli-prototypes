import { User } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

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
	return (
		<div className="z-10 mx-auto flex w-full max-w-[1300px] flex-col">
			<div className="z-10 flex h-14 items-center justify-between px-4 sm:h-16 sm:px-6">
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
				<div className="flex items-center gap-3 sm:gap-8">
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
							<Link href="/sign-in">Sign In</Link>
						</Button>
					)}
				</div>
			</div>

			<div className="mt-6 max-w-[1400px] overflow-auto px-4 pb-10 sm:mt-10 sm:px-0">
				{children}
			</div>
		</div>
	);
}
