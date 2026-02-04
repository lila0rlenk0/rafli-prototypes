'use client';

import { Ticket } from 'lucide-react';
import Link from 'next/link';
import { useContext } from 'react';

import { Button } from '@/components/ui/button';
import { UserStoreContext, useUserStore } from '@/providers/user-store-provider';
import { USER_MODE } from '@/types/user-mode';

/**
 * Props for PromoCodesButton
 */
interface PromoCodesButtonProps {
	publicSlug: string;
	isOwner: boolean;
	isManageable: boolean;
}

/**
 * PromoCodesButton Component
 *
 * Shows the "Promo Codes" button for hosts managing their raffles.
 * Only visible when:
 * - User is the owner of the raffle
 * - Raffle is in manageable status (draft, queued, live)
 * - User is in HOST mode
 *
 * @param publicSlug - The public slug for the raffle
 * @param isOwner - Whether the current user owns this raffle
 * @param isManageable - Whether the raffle status allows promo code management
 */
export function PromoCodesButton({
	publicSlug,
	isOwner,
	isManageable,
}: PromoCodesButtonProps) {
	const hasProvider = useContext(UserStoreContext) !== undefined;

	if (!hasProvider) {
		return null;
	}

	return (
		<PromoCodesButtonContent
			publicSlug={publicSlug}
			isOwner={isOwner}
			isManageable={isManageable}
		/>
	);
}

/**
 * PromoCodesButtonContent Component
 *
 * Inner component that safely uses the user store.
 * Only rendered when UserStoreProvider is available.
 */
function PromoCodesButtonContent({
	publicSlug,
	isOwner,
	isManageable,
}: PromoCodesButtonProps) {
	const mode = useUserStore(state => state.mode);

	/**
	 * Determines if the button should be shown
	 */
	function shouldShow(): boolean {
		if (mode === null) {
			return false;
		}

		const isHostMode = mode === USER_MODE.HOST;
		return isOwner && isManageable && isHostMode;
	}

	if (!shouldShow()) {
		return null;
	}

	return (
		<Button
			asChild
			variant="outline"
			size="sm"
			className="gap-1.5"
		>
			<Link href={`/my-raffles/${publicSlug}/promo-codes`}>
				<Ticket className="size-4" />
				Promo Codes
			</Link>
		</Button>
	);
}
