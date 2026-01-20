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

	/**
	 * Gets the page title based on user mode
	 */
	function getPageTitle(): string {
		if (mode === USER_MODE.HOST) {
			return 'My Created Raffles';
		}
		return 'My Entered Raffles';
	}

	/**
	 * Gets the mode display label
	 */
	function getModeLabel(): string {
		if (mode === USER_MODE.HOST) {
			return 'Host Mode';
		}
		return 'Participant Mode';
	}

	// Show skeleton while mode is initializing
	if (mode === null) {
		return (
			<div className="mb-12 text-center">
				<div className="mx-auto mb-3 h-6 w-32 animate-pulse rounded-full bg-gray-200" />
				<div className="mx-auto h-12 w-64 animate-pulse rounded-lg bg-gray-200" />
			</div>
		);
	}

	const isHostMode = mode === USER_MODE.HOST;

	return (
		<div className="mb-16 text-center">
			<div
				className={`mb-6 inline-block rounded-lg px-4 py-2 text-sm font-medium ${
					isHostMode
						? 'bg-[#FAFFC4] text-[#998B53]'
						: 'bg-[#BEFFDB] text-[#44B476]'
				}`}
			>
				{getModeLabel()}
			</div>
			<h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
				{getPageTitle()}
			</h1>
		</div>
	);
}
