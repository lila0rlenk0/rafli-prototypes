'use client';

import type { CSSProperties } from 'react';

interface RaffleProgressSectionProps {
	participantsDisplay: string;
	fillStatus: string;
	progressFillStyle: CSSProperties;
}

/**
 * Top-of-card progress visualization — participant count, fill status,
 * and the horizontal bar. Pure presentation; inputs are pre-formatted by
 * the parent so this subtree is cheap to re-render.
 */
export function RaffleProgressSection({
	participantsDisplay,
	fillStatus,
	progressFillStyle,
}: RaffleProgressSectionProps) {
	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center justify-between text-sm">
				<span className="text-ink-500">{participantsDisplay}</span>
				<span className="text-ink-500 font-medium">{fillStatus}</span>
			</div>

			<div className="h-2.75 w-full overflow-hidden rounded-full bg-gray-100">
				<div
					className="bg-primary h-full transition-all duration-300 ease-out"
					style={progressFillStyle}
				/>
			</div>
		</div>
	);
}
