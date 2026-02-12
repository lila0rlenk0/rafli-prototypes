/**
 * Formats a numeric amount as a currency string
 * @param amount - The amount to format (number or string)
 * @param currency - Currency code (e.g., "USD")
 * @returns Formatted currency string (e.g., "$1,000")
 */
export function formatCurrency(
	amount: number | string,
	currency: string,
): string {
	const numericAmount =
		typeof amount === 'string' ? parseFloat(amount) : amount;

	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency,
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	}).format(numericAmount);
}
