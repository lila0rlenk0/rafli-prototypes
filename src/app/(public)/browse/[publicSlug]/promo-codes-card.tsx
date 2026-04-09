'use client';

import { Ticket } from 'lucide-react';
import Link from 'next/link';
import { useContext } from 'react';

import {
	UserStoreContext,
	useUserStore,
} from '@/providers/user-store-provider';
import { USER_MODE } from '@/types/user-mode';

/**
 * Props for PromoCodesCard
 */
interface PromoCodesCardProps {
	publicSlug: string;
	isOwner: boolean;
	isManageable: boolean;
}

/**
 * Promo codes card shown to raffle hosts in the right sidebar.
 * Only visible when user is the owner, raffle is manageable, and user is in HOST mode.
 *
 * @param publicSlug - The public slug for the raffle
 * @param isOwner - Whether the current user owns this raffle
 * @param isManageable - Whether the raffle status allows promo code management
 */
export function PromoCodesCard({
	publicSlug,
	isOwner,
	isManageable,
}: PromoCodesCardProps) {
	const hasProvider = useContext(UserStoreContext) !== undefined;

	if (!hasProvider) {
		return null;
	}

	return (
		<PromoCodesCardContent
			publicSlug={publicSlug}
			isOwner={isOwner}
			isManageable={isManageable}
		/>
	);
}

/**
 * Inner component that safely uses the user store.
 * Only rendered when UserStoreProvider is available.
 */
function PromoCodesCardContent({
	publicSlug,
	isOwner,
	isManageable,
}: PromoCodesCardProps) {
	const mode = useUserStore(state => state.mode);

	if (mode === null || !isOwner || !isManageable || mode !== USER_MODE.HOST) {
		return null;
	}

	return (
		<div className="mt-8 flex flex-col items-center gap-8 rounded-3xl border border-black bg-white/95 px-6 py-10">
			<div className="flex flex-col items-center gap-4">
				<div className="flex flex-col items-center gap-4">
					<Ticket className="size-10" />
					<h3 className="text-center text-lg font-semibold">
						Invite more people with promo codes
					</h3>
				</div>
				<p className="text-center text-base text-[#7B7B7B]">
					Use promo codes to attract new participants or reward your existing
					audience.
				</p>
			</div>

			<Link
				href={`/my-raffles/${publicSlug}/promo-codes`}
				className="rounded-full border border-black px-6 py-3 text-center font-semibold transition-colors hover:bg-black hover:text-white"
			>
				See promo codes
			</Link>
		</div>
	);
}
