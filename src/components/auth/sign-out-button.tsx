'use client';

import { signOutUser } from '@/services/auth/sign-out-user';
import { useState } from 'react';

interface SignOutButtonProps {
	className?: string;
	variant?: 'default' | 'outline' | 'ghost';
}

export function SignOutButton({
	className = '',
	variant = 'default',
}: SignOutButtonProps) {
	const [isLoading, setIsLoading] = useState(false);

	const handleSignOut = async () => {
		setIsLoading(true);
		try {
			await signOutUser();
		} catch (error) {
			// Error is logged in signOutUser, cookies are cleared anyway
			console.error('Sign out failed:', error);
		} finally {
			// Note: We may not reach here due to redirect in signOutUser
			setIsLoading(false);
		}
	};

	const baseStyles =
		'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

	const variantStyles = {
		default: 'bg-red-600 text-white hover:bg-red-700',
		outline:
			'border border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-950',
		ghost: 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950',
	};

	return (
		<button
			onClick={handleSignOut}
			disabled={isLoading}
			className={`${baseStyles} ${variantStyles[variant]} px-4 py-2 ${className}`}
			type="button"
		>
			{isLoading ? 'Signing out...' : 'Sign Out'}
		</button>
	);
}
