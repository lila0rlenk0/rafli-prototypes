'use client';

import { Button } from '@/components/ui/button';
import {
	UserStoreContext,
	useUserStore,
} from '@/providers/user-store-provider';
import { USER_MODE } from '@/types/user-mode';
import Link from 'next/link';
import { useContext } from 'react';

interface PostUpdateButtonProps {
	publicSlug: string;
	isOwner: boolean;
	canManageUpdates: boolean;
}

/**
 * PostUpdateButton Component
 *
 * Shows the "Add update" button for hosts viewing their own live raffles.
 * Only visible when:
 * - User is the owner of the raffle
 * - Raffle is in an update-manageable status
 * - User is in HOST mode
 *
 * Uses a guard pattern to avoid using hooks outside UserStoreProvider.
 *
 * @param publicSlug - The public slug for the raffle
 * @param isOwner - Whether the current user owns this raffle
 * @param canManageUpdates - Whether raffle status allows host updates
 */
export function PostUpdateButton({
	publicSlug,
	isOwner,
	canManageUpdates,
}: PostUpdateButtonProps) {
	const hasProvider = useContext(UserStoreContext) !== undefined;

	// Don't render anything if outside provider (non-authenticated users)
	if (!hasProvider) {
		return null;
	}

	return (
		<PostUpdateButtonContent
			publicSlug={publicSlug}
			isOwner={isOwner}
			canManageUpdates={canManageUpdates}
		/>
	);
}

/**
 * PostUpdateButtonContent Component
 *
 * Inner component that safely uses the user store.
 * Only rendered when UserStoreProvider is available.
 */
function PostUpdateButtonContent({
	publicSlug,
	isOwner,
	canManageUpdates,
}: PostUpdateButtonProps) {
	const mode = useUserStore(state => state.mode);

	/**
	 * Determines if the button should be shown
	 * Requires owner + live raffle + host mode
	 */
	function shouldShow(): boolean {
		if (mode === null) {
			return false;
		}

		const isHostMode = mode === USER_MODE.HOST;
		return isOwner && canManageUpdates && isHostMode;
	}

	if (!shouldShow()) {
		return null;
	}

	return (
		<Button
			asChild
			className="cursor-pointer rounded-full border-2 border-black bg-white px-6 text-black hover:bg-black hover:text-white"
			onClick={e => e.stopPropagation()}
		>
			<Link href={`/my-raffles/${publicSlug}/update`} className="font-semibold">
				Add update
			</Link>
		</Button>
	);
}
