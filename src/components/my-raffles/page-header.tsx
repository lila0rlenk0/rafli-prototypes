'use client';

import { useUserStore } from '@/providers/user-store-provider';
import { USER_MODE } from '@/types/user-mode';

/**
 * PageHeader Component
 *
 * Displays mode badge and dynamic title based on user mode.
 * - Participant mode: "My Entered Raffles"
 * - Host mode: "My Created Raffles"
 */
export function PageHeader() {
	const mode = useUserStore(state => state.mode);

	// Null while mode is hydrating from cookie — show skeleton to avoid layout shift
	if (mode === null) {
		return (
			<div className="mb-12 text-center">
				<div className="mx-auto mb-3 h-6 w-32 animate-pulse rounded-full bg-gray-200" />
				<div className="mx-auto h-12 w-64 animate-pulse rounded-lg bg-gray-200" />
			</div>
		);
	}

	const isHostMode = mode === USER_MODE.HOST;
	const modeLabel = isHostMode ? 'Host Mode' : 'Participant Mode';
	const pageTitle = isHostMode
		? 'My Created Sweepstakes'
		: 'My Entered Sweepstakes';

	return (
		<div className="mb-16 text-center">
			<div
				className={`mb-6 inline-block rounded-lg px-4 py-2 text-sm font-medium ${
					isHostMode
						? 'bg-role-host-bg text-role-host-fg'
						: 'bg-brand-mint text-role-participant-fg'
				}`}
			>
				{modeLabel}
			</div>
			<h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
				{pageTitle}
			</h1>
		</div>
	);
}
