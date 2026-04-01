'use client';

import { cn } from '@/lib/utils';
import { useUserStore } from '@/providers/user-store-provider';
import { signOutUser } from '@/services/auth/sign-out-user';
import { useState } from 'react';

interface SignOutButtonProps {
	className?: string;
}

/**
 * Sign-out button styled to match the profile page design
 *
 * @returns Red filled button with rounded-full shape
 */
export function SignOutButton({ className }: SignOutButtonProps) {
	const [isLoading, setIsLoading] = useState(false);
	const reset = useUserStore(state => state.reset);

	async function handleSignOut() {
		setIsLoading(true);
		try {
			reset();
			await signOutUser();
		} catch (error) {
			console.error('Sign out failed:', error);
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<button
			onClick={handleSignOut}
			disabled={isLoading}
			className={cn(
				'inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-[#E5484D] px-6 py-4 text-base font-semibold text-white transition-colors hover:bg-[#D93D42] disabled:pointer-events-none disabled:opacity-50',
				className,
			)}
			type="button"
		>
			{isLoading ? 'Signing out...' : 'Sign out'}
		</button>
	);
}
