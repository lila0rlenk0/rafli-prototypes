/**
 * Formats a date to a readable format (e.g., "Jan 16, 2026")
 * @param dateInput - Date object, ISO date string, or date string in any valid format
 * @returns Formatted date string (e.g., "Jan 16, 2026")
 */
export function formatDate(dateInput: string | Date): string {
	if (!dateInput) return '';
	const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
	return date.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	});
}

/**
 * Formats a date + time (HH:mm) to a readable format (e.g., "Jan 16, 2026 at 2:30 PM")
 * @param dateInput - Date string (YYYY-MM-DD) or Date object
 * @param time - Time string in HH:mm format (e.g., "14:30")
 * @returns Formatted datetime string
 */
export function formatDateTime(dateInput: string | Date, time: string): string {
	if (!dateInput) return '';
	// Build a full datetime string so the Date constructor parses both date and time
	const dateStr =
		typeof dateInput === 'string' ? dateInput : dateInput.toISOString();
	const combined = time ? `${dateStr.split('T')[0]}T${time}` : dateStr;
	const date = new Date(combined);
	return date.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	});
}
