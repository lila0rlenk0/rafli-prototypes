export interface TimeRemaining {
	days: number;
	hours: number;
	minutes: number;
	seconds: number;
	isExpired: boolean;
}

const SECONDS_PER_DAY = 86_400;
const SECONDS_PER_HOUR = 3_600;
const SECONDS_PER_MINUTE = 60;

/**
 * Decomposes a total number of seconds into days, hours, minutes, seconds.
 * Returns expired state when secondsRemaining <= 0.
 * @param secondsRemaining - total seconds until expiry
 * @returns time broken down into units with expiry flag
 */
export function calculateTimeRemaining(
	secondsRemaining: number,
): TimeRemaining {
	if (secondsRemaining <= 0) {
		return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
	}

	const days = Math.floor(secondsRemaining / SECONDS_PER_DAY);
	const hours = Math.floor(
		(secondsRemaining % SECONDS_PER_DAY) / SECONDS_PER_HOUR,
	);
	const minutes = Math.floor(
		(secondsRemaining % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE,
	);
	const seconds = secondsRemaining % SECONDS_PER_MINUTE;

	return { days, hours, minutes, seconds, isExpired: false };
}
