'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

/** Sign-in CTA for unauthenticated users — preserves pathname+query in returnTo. */
export function SignInToBuyButton() {
	const pathname = usePathname();
	const searchParams = useSearchParams();

	function getFullUrl(): string {
		const search = searchParams.toString();
		return search ? `${pathname}?${search}` : pathname;
	}

	function getSignInUrl(): string {
		return `/sign-in?returnTo=${encodeURIComponent(getFullUrl())}`;
	}

	return (
		// No id="checkout-action" — that id is reserved for the mobile sticky
		// CTA's primary button. This component renders only on desktop (and is
		// hidden on mobile by `TicketPurchaseCard`'s wrapper), so e2e tests
		// that target mobile checkout never look for this element.
		<Button
			asChild
			className="h-12 w-full cursor-pointer border-2 border-black bg-black hover:bg-white hover:text-black"
		>
			<Link href={getSignInUrl()}>
				<p className="font-semibold">Sign in to buy tickets</p>
			</Link>
		</Button>
	);
}
