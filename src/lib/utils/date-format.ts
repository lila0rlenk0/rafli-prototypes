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
