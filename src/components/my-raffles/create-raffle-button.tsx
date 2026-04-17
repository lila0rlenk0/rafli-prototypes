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
 * Returns null while mode is initializing.
 */
export function CreateRaffleButton() {
	const mode = useUserStore(state => state.mode);
	const canSwitchMode = useUserStore(state => state.canSwitchMode);

	// Null while mode is hydrating from cookie
	if (mode === null || !canSwitchMode() || mode !== USER_MODE.HOST) {
		return null;
	}

	return (
		<Link href="/my-raffles/create">
			<Button className="font-clash-display hover:bg-background cursor-pointer border-2 border-black bg-black px-8 font-semibold hover:text-black">
				Create new Raffle
			</Button>
		</Link>
	);
}
