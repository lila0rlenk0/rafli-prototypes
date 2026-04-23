'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import type { RaffleStatus } from '@/types/raffle';

import { RaffleDrawCard } from '@/components/raffle/cards/draw-card';
import { RaffleAutoRefresh } from '@/components/raffle/countdown/auto-refresh';

interface RaffleDrawWithRefreshProps {
	/** Current raffle status from the server */
	status: RaffleStatus;
	/** ISO datetime string for raffle end time */
	endAt: string;
	/** Whether the raffle has selected winners */
	hasWinners: boolean;
}

/**
 * Client wrapper that wires RaffleDrawCard and RaffleAutoRefresh together.
 *
 * Bridges the timeout signal from the polling component to the draw card so
 * users see an actionable message instead of an infinite spinner when the
 * VRF draw takes longer than the polling budget allows.
 */
export function RaffleDrawWithRefresh({
	status,
	endAt,
	hasWinners,
}: RaffleDrawWithRefreshProps) {
	const router = useRouter();
	const [timedOut, setTimedOut] = useState(false);

	const handleTimeout = useCallback(() => setTimedOut(true), []);
	const handleRefresh = useCallback(() => {
		// Reset timeout state so the card shows the spinner again while
		// the server re-fetches — if the raffle moved to a steady state
		// the polling component won't re-activate.
		setTimedOut(false);
		router.refresh();
	}, [router]);

	return (
		<>
			<RaffleDrawCard timedOut={timedOut} onRefresh={handleRefresh} />
			{/* Unmount the polling component while timed out so the manual refresh
			   remounts it with fresh internal state. RaffleAutoRefresh tracks the
			   exhausted phase in local state — without remount, clicking Refresh
			   would show the spinner but polling would stay halted because the
			   child's timedOutPhase === phase check skips the timer setup. */}
			{!timedOut ? (
				<RaffleAutoRefresh
					status={status}
					endAt={endAt}
					hasWinners={hasWinners}
					onTimeout={handleTimeout}
				/>
			) : null}
		</>
	);
}
