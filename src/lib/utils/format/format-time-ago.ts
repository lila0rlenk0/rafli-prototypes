const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
/** Show "Xd ago" for up to 7 days, then fall back to absolute date */
const RELATIVE_DAY_LIMIT = 7;

/**
 * Formats a date to relative time (e.g., "5m ago", "2h ago", "3d ago").
 * Falls back to localized absolute date for anything older than 7 days.
 *
 * @param dateInput - Date object or ISO date string
 * @returns Formatted relative time string
 */
export function formatTimeAgo(dateInput: string | Date): string {
	const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / MS_PER_MINUTE);
	const diffHours = Math.floor(diffMs / MS_PER_HOUR);
	const diffDays = Math.floor(diffMs / MS_PER_DAY);

	if (diffMins < 1) return 'Just now';
	if (diffMins < MINUTES_PER_HOUR) return `${diffMins}m ago`;
	if (diffHours < HOURS_PER_DAY) return `${diffHours}h ago`;
	if (diffDays < RELATIVE_DAY_LIMIT) return `${diffDays}d ago`;
	return date.toLocaleDateString();
}
