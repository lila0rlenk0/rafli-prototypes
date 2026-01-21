'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * SignInToBuyButton Component
 *
 * A call-to-action button displayed to non-authenticated users
 * on the raffle detail page. Clicking redirects to sign-in
 * with a returnTo parameter to bring the user back after authentication.
 */
export function SignInToBuyButton() {
	const pathname = usePathname();

	/**
	 * Builds the sign-in URL with returnTo parameter
	 * @returns URL string for sign-in redirect
	 */
	function getSignInUrl(): string {
		return `/sign-in?returnTo=${encodeURIComponent(pathname)}`;
	}

	return (
		<Button
			asChild
			className="hover:bg-background w-full cursor-pointer border-2 border-black bg-black hover:text-black"
		>
			<Link href={getSignInUrl()}>
				<p className="font-semibold">Sign in to buy tickets</p>
			</Link>
		</Button>
	);
}
