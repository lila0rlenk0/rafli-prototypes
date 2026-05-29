'use client';

import { RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import { RaffleAutoRefresh } from '@/components/raffle/countdown/auto-refresh';
import { Button } from '@/components/ui/button';
import type { RaffleStatus } from '@/types/raffle';

interface RaffleAutoRefreshWithRetryProps {
	status: RaffleStatus;
	endAt: string;
	hasWinners: boolean;
}

/**
 * Top-level transitional-state poller paired with a manual refresh
 * affordance. `RaffleAutoRefresh` alone silently halts when its per-phase
 * budget expires (10 min AWAITING_STATUS_FLIP, 30 min AWAITING_WINNERS,
 * 2 min AWAITING_COMPLETION) — without a visible retry path the user is
 * stranded on stale state. Re-mounts the polling child on retry so its
 * internal `timedOutPhase` resets and polling resumes.
 *
 * @returns Polling component while live, retry card once a phase times out
 */
export function RaffleAutoRefreshWithRetry({
	status,
	endAt,
	hasWinners,
}: RaffleAutoRefreshWithRetryProps) {
	const router = useRouter();
	const [timedOut, setTimedOut] = useState(false);

	const handleTimeout = useCallback(function markTimedOut() {
		setTimedOut(true);
	}, []);

	const handleRefresh = useCallback(
		function resetAndRefresh() {
			setTimedOut(false);
			router.refresh();
		},
		[router],
	);

	if (timedOut) {
		return (
			<div
				role="status"
				aria-live="polite"
				className="border-border bg-card flex items-center justify-between gap-3 rounded-2xl border px-4 py-3"
			>
				<p className="text-muted-foreground text-sm">Updates may be delayed.</p>
				<Button variant="outline" size="sm" onClick={handleRefresh}>
					<RefreshCw aria-hidden />
					Refresh
				</Button>
			</div>
		);
	}

	return (
		<RaffleAutoRefresh
			status={status}
			endAt={endAt}
			hasWinners={hasWinners}
			onTimeout={handleTimeout}
		/>
	);
}
