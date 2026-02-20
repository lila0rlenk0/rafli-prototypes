'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface BackLinkProps {
	fallbackHref: string;
	label: string;
}

/**
 * Client-side back navigation link.
 * Uses browser history when referrer is same origin, falls back to provided href.
 */
export function BackLink({ fallbackHref, label }: BackLinkProps) {
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
			router.push(fallbackHref);
		}
	}

	return (
		<button
			onClick={handleBack}
			className="flex w-fit cursor-pointer items-center gap-2"
		>
			<ArrowLeft className="size-4" />
			<span className="font-semibold">{label}</span>
		</button>
	);
}
