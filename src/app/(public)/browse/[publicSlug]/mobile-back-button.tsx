'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

/**
 * Mobile-only back button for the raffle detail page.
 * Uses browser history when referrer is same origin, falls back to /browse.
 * Hidden on desktop where BackLink text is shown.
 *
 * @returns Back arrow button visible only on mobile (< lg breakpoint)
 */
export function MobileBackButton() {
	const router = useRouter();

	/** Checks if referrer is from the same origin (internal navigation) */
	function hasInternalReferrer(): boolean {
		if (!document.referrer) return false;
		try {
			return new URL(document.referrer).origin === window.location.origin;
		} catch {
			return false;
		}
	}

	function handleBack() {
		if (hasInternalReferrer()) {
			router.back();
		} else {
			router.push('/browse');
		}
	}

	return (
		<button
			onClick={handleBack}
			className="flex cursor-pointer items-center lg:hidden"
			aria-label="Go back"
		>
			<ArrowLeft className="size-6" />
		</button>
	);
}
