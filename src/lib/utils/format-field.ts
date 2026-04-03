/**
 * Formatting helpers for KYC/KYB form data display.
 * Used by both admin and user-facing submission detail pages.
 */

import { formatDate } from './date-format';

/**
 * Wraps formatDate with null handling — finalizedAt and reviewedAt
 * are null for draft/pending submissions.
 *
 * @returns Formatted date or em dash for null
 */
export function formatNullableDate(date: string | null): string {
	return date ? formatDate(date) : '—';
}

/**
 * Converts a camelCase or snake_case key to a readable label.
 * Example: "fullLegalName" -> "Full Legal Name", "date_of_birth" -> "Date Of Birth"
 *
 * @returns Human-readable label
 */
export function formatFieldLabel(key: string): string {
	return key
		.replace(/_/g, ' ')
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.replace(/\b\w/g, char => char.toUpperCase());
}

/**
 * Renders a form data value — handles strings, arrays, nulls, and objects.
 * Arrays are comma-joined. Objects are JSON-stringified as fallback.
 *
 * @returns String representation of the value
 */
export function formatFieldValue(value: unknown): string {
	if (value === null || value === undefined) return '—';
	if (Array.isArray(value)) return value.join(', ');
	if (typeof value === 'object') return JSON.stringify(value);
	return String(value);
}
