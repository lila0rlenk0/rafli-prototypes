'use client';

import { cn } from '@/lib/utils';
import { useUserStore } from '@/providers/user-store-provider';
import { signOutUser } from '@/services/auth/sign-out-user';
import { useState } from 'react';

interface SignOutButtonProps {
	className?: string;
	/** Visual style — defaults to the red filled button used on the profile page */
	variant?: 'default' | 'ghost' | 'outline';
}

/** Base styles shared across all variants */
const BASE_STYLES =
	'inline-flex h-11 cursor-pointer items-center justify-center rounded-full px-6 py-4 text-base font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50';

/** Per-variant color overrides */
const VARIANT_STYLES: Record<
	NonNullable<SignOutButtonProps['variant']>,
	string
> = {
	default: 'bg-[#E5484D] text-white hover:bg-[#D93D42]',
	ghost: 'bg-transparent text-black hover:bg-black/5',
	outline: 'border border-black/20 bg-transparent text-black hover:bg-black/5',
};

/** Sign-out button — default red for profile, ghost/outline for admin navbar. */
export function SignOutButton({
	className,
	variant = 'default',
}: SignOutButtonProps) {
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
			className={cn(BASE_STYLES, VARIANT_STYLES[variant], className)}
			type="button"
		>
			{isLoading ? 'Signing out...' : 'Sign out'}
		</button>
	);
}
