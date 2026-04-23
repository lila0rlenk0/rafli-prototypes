/**
 * Pure date helpers shared by the create + edit wizards' Tickets step.
 *
 * Kept framework-free (no React imports) so they're cheap to unit-test and
 * safe to import from any layer. All helpers treat the stored format as
 * `YYYY-MM-DD` for dates and `HH:mm` for times — the DatePicker / TimePicker
 * primitives produce those shapes directly.
 */

// Minimum duration between start and end — matches the backend constraint
// mirrored in `create-form-schema.ts` / `edit-form-schema.ts`.
const MS_PER_DAY = 86_400_000;

/**
 * Builds a local Date from separate date (`YYYY-MM-DD`) and time (`HH:mm`)
 * strings. Falls back to midnight when time is missing so downstream date
 * arithmetic never crashes on a partially-filled form.
 *
 * @param date - Date in `YYYY-MM-DD` format.
 * @param time - Time in `HH:mm` format; empty string is treated as `00:00`.
 * @returns Local Date assembled from the two strings.
 */
export function buildDateTime(date: string, time: string): Date {
	const [y, m, d] = date.split('-').map(Number);
	const [h, min] = (time || '00:00').split(':').map(Number);
	return new Date(y, m - 1, d, h, min);
}

/**
 * Returns today's date normalized to local midnight. Used as the lower
 * bound for DatePicker so past dates are non-selectable.
 *
 * @returns Date at today's local midnight.
 */
export function getTodayDate(): Date {
	const today = new Date();
	return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

/**
 * Compares the provided start-date string to today using year/month/day
 * equality on local-midnight-normalized Dates. Avoids UTC drift that would
 * incorrectly flip "today" to "yesterday" for users east of UTC.
 *
 * @param dateString - Start date in `YYYY-MM-DD` format.
 * @returns `true` when the parsed date matches today's local date.
 */
export function checkIfStartDateIsToday(dateString: string): boolean {
	if (!dateString) return false;
	const [year, month, day] = dateString.split('-').map(Number);
	const start = new Date(year, month - 1, day);
	const today = getTodayDate();
	return (
		start.getFullYear() === today.getFullYear() &&
		start.getMonth() === today.getMonth() &&
		start.getDate() === today.getDate()
	);
}

/**
 * Validates that the end datetime lies at least 24 hours after the start
 * datetime. When either date is missing the range is treated as valid so
 * the caller only shows the error once both sides have been filled.
 *
 * @param start - `{ date, time }` pair describing the raffle start.
 * @param end - `{ date, time }` pair describing the raffle end.
 * @returns `true` when the range is empty or spans at least 24 hours.
 */
export function isDateRangeValid(
	start: { date: string; time: string },
	end: { date: string; time: string },
): boolean {
	if (!start.date || !end.date) return true;
	const startAt = buildDateTime(start.date, start.time);
	const endAt = buildDateTime(end.date, end.time);
	return endAt.getTime() - startAt.getTime() >= MS_PER_DAY;
}

/**
 * Validates that the end date falls within 6 calendar months of the start
 * date — platform policy ceiling on raffle duration. Missing inputs are
 * treated as valid so the error only surfaces once both sides exist.
 *
 * @param start - `{ date, time }` pair describing the raffle start.
 * @param end - `{ date, time }` pair describing the raffle end.
 * @returns `true` when the end date is at or before start + 6 months.
 */
export function isEndDateWithin6Months(
	start: { date: string; time: string },
	end: { date: string; time: string },
): boolean {
	if (!start.date || !end.date) return true;
	const startAt = buildDateTime(start.date, start.time);
	const endAt = buildDateTime(end.date, end.time);
	// Cloning avoids mutating the caller's reference when setMonth rolls over.
	const maxEnd = new Date(startAt);
	maxEnd.setMonth(maxEnd.getMonth() + 6);
	return endAt <= maxEnd;
}
