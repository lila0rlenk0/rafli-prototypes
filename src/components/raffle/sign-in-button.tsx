'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * SignInToBuyButton Component
 *
 * A call-to-action button displayed to non-authenticated users
 * on the raffle detail page. Clicking redirects to sign-in
 * with a returnTo parameter to bring the user back after authentication.
 * Preserves query params (e.g., promo codes) through auth flow.
 */
export function SignInToBuyButton() {
	const pathname = usePathname();
	const searchParams = useSearchParams();

	/**
	 * Builds full URL with pathname and search params
	 * @returns Full URL path with query string
	 */
	function getFullUrl(): string {
		// Step 1: Build pathname + query string.
		const search = searchParams.toString();
		return search ? `${pathname}?${search}` : pathname;
	}

	/**
	 * Builds the sign-in URL with returnTo parameter
	 * @returns URL string for sign-in redirect
	 */
	function getSignInUrl(): string {
		// Step 1: Encode returnTo for sign-in redirect.
		return `/sign-in?returnTo=${encodeURIComponent(getFullUrl())}`;
	}

	return (
		<Button
			id="checkout-action"
			asChild
			className="hover:bg-background w-full cursor-pointer border-2 border-black bg-black hover:text-black"
		>
			<Link href={getSignInUrl()}>
				<p className="font-semibold">Sign in to buy tickets</p>
			</Link>
		</Button>
	);
}
