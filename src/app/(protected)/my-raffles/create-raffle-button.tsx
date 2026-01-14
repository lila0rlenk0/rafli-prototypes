'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { useUserStore } from '@/providers/user-store-provider';
import { USER_MODE } from '@/types/user-mode';

/**
 * CreateRaffleButton Component
 *
 * Only visible in Host mode.
 * Conditionally renders based on user's current mode.
 */
export function CreateRaffleButton() {
	const mode = useUserStore(state => state.mode);
	const canSwitchMode = useUserStore(state => state.canSwitchMode);

	const shouldShowButton = canSwitchMode() && mode === USER_MODE.HOST;

	if (!shouldShowButton) {
		return null;
	}

	return (
		<Link href="/my-raffles/create">
			<Button className="font-clash-display bg-black px-8 font-semibold">
				Create new Raffle
			</Button>
		</Link>
	);
}
