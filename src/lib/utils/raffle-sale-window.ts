import { differenceInSeconds } from 'date-fns';

import {
	calculateTimeRemaining,
	type TimeRemaining,
} from '@/lib/utils/calculate-time-remaining';

/**
 * Final-10-minute warning threshold.
 * Product decision: warn aggressively near close, but do not block checkout.
 */
export const RAFFLE_CLOSING_SOON_THRESHOLD_SECONDS = 10 * 60;

export interface RaffleSaleWindow extends TimeRemaining {
	isClosingSoon: boolean;
	secondsRemaining: number;
}

/**
 * Resolves the current sale window for a raffle.
 *
 * Why this helper exists:
 * - countdown, purchase CTAs, and crypto review must use the same threshold
 * - exact `endAt` remains the cutoff; "closing soon" is informational only
 * - centralizing the rule prevents drift between warning surfaces
 */
export function getRaffleSaleWindow(
	endAt: string,
	now: Date = new Date(),
): RaffleSaleWindow {
	const secondsRemaining = differenceInSeconds(new Date(endAt), now);
	const timeRemaining = calculateTimeRemaining(secondsRemaining);

	return {
		...timeRemaining,
		// Clamp at zero so callers never render negative countdown values.
		secondsRemaining: Math.max(secondsRemaining, 0),
		// Keep the warning scoped to active sales only.
		// Once expired, callers should show terminal UI instead of "closing soon".
		isClosingSoon:
			secondsRemaining > 0 &&
			secondsRemaining <= RAFFLE_CLOSING_SOON_THRESHOLD_SECONDS,
	};
}
