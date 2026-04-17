/**
 * Countdown formatter for the launch-pricing banner.
 *
 * Pure function extracted from the `LaunchCountdown` component so the
 * timing math is unit-testable without a DOM. The component owns the
 * `Date.now()` tick; this helper owns the `ms → HH:MM:SS` derivation.
 *
 * Design choices:
 * - `hours` is total hours (unbounded, not modulo 24) because the banner
 *   doubles as a "this is imminent" signal — showing "2d 04h" hides how
 *   close the deadline actually is. A value of 73 hours renders "73:00:00"
 *   and still reads correctly.
 * - `expired` is a dedicated flag (not just `ms <= 0`) so callers can
 *   react declaratively: the component swaps the ticker for an "ended"
 *   banner rather than flashing "00:00:00" indefinitely.
 * - Negative input is coerced to zero/expired — clock drift or slow JS
 *   can put `ms` slightly below zero on the last tick, and a negative
 *   `HH` in the DOM is worse than showing the expired state a tick early.
 */

/** Result of formatting a countdown — every field safe to render directly. */
export interface CountdownParts {
	/** Zero-padded total hours (e.g. "01", "48") — never modulo 24. */
	hours: string;
	/** Zero-padded minutes within the hour (00-59). */
	minutes: string;
	/** Zero-padded seconds within the minute (00-59). */
	seconds: string;
	/** `true` once the deadline has passed — caller swaps to an ended state. */
	expired: boolean;
}

// Hoisted so the formatter isn't re-creating a String() -> padStart tight loop
// inside a 1Hz component tick. Micro-optimisation; kept because it also reads
// cleaner than inline `.padStart(2, '0')` in each branch.
const MS_PER_SECOND = 1_000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;

/**
 * Formats a millisecond delta into `HH:MM:SS` parts for display.
 *
 * @param msRemaining - Milliseconds until the deadline (`endsAt - now`).
 *   Negative values are coerced to zero and flagged `expired`.
 * @returns Pre-formatted parts ready for direct insertion into the DOM.
 */
export function formatCountdown(msRemaining: number): CountdownParts {
	// Step 1: Clamp negatives — clock drift can yield ~-100ms on the last
	// tick, and a negative HH is a worse failure mode than an early expiry.
	if (!Number.isFinite(msRemaining) || msRemaining <= 0) {
		return { hours: '00', minutes: '00', seconds: '00', expired: true };
	}

	// Step 2: Derive the whole-second count — discards sub-second jitter so
	// consecutive ticks render the same display until the second crosses.
	const totalSeconds = Math.floor(msRemaining / MS_PER_SECOND);

	// Step 3: Split into H/M/S. Hours deliberately NOT mod 24: the banner is
	// a "closer than you think" signal, and a 3-day countdown that renders
	// "03:00:00" reads better than "3d 00h 00m".
	const hours = Math.floor(
		totalSeconds / (MINUTES_PER_HOUR * SECONDS_PER_MINUTE),
	);
	const minutes = Math.floor(
		(totalSeconds % (MINUTES_PER_HOUR * SECONDS_PER_MINUTE)) /
			SECONDS_PER_MINUTE,
	);
	const seconds = totalSeconds % SECONDS_PER_MINUTE;

	return {
		hours: String(hours).padStart(2, '0'),
		minutes: String(minutes).padStart(2, '0'),
		seconds: String(seconds).padStart(2, '0'),
		expired: false,
	};
}
