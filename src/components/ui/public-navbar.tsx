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
			<div className="z-10 flex h-16 items-center justify-between px-6">
				<div className="flex items-center gap-8">
					<Link href="/browse">
						<Logo />
					</Link>

					<div className="h-8 w-px bg-[#E6E8EC]" />

					<Link href="/browse" className="text-sm font-semibold">
						Browse
					</Link>

					{isAuthenticated && (
						<Link href="/my-raffles" className="text-sm font-semibold">
							My Raffles
						</Link>
					)}
				</div>
				<div className="flex items-center gap-8">
					{isAuthenticated ? (
						<>
							<ModeSwitchButton />

							<NotificationBell />

							<Link href="/profile">
								<User className="size-5" />
							</Link>
						</>
					) : (
						<Button asChild className="h-10 px-6">
							<Link href="/sign-in">Sign In</Link>
						</Button>
					)}
				</div>
			</div>

			<div className="mt-10 max-w-[1400px] overflow-auto pb-10">{children}</div>
		</div>
	);
}
