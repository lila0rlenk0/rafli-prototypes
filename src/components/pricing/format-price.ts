/**
 * Formats a backend decimal-string price into the display form shown on the
 * plan card ("$25" / "$29.99").
 *
 * Why a helper:
 * - Backend sends `"25.0000"` for exact storage — rendering that verbatim
 *   leaks wire-format noise into the UI. `Intl.NumberFormat` with a
 *   min-fraction-of-0 strips trailing zeros while still honoring cents
 *   when they exist.
 * - A pure helper is trivially unit-testable vs. inline `Number(...)` in
 *   JSX, and keeps the component tree free of formatting logic.
 *
 * USD is hard-coded because the subscription product is USD-only today.
 * When that stops being true, promote to a two-arg function — not sooner.
 *
 * @param decimal - Backend decimal string (e.g. `"25.0000"`, `"29.9900"`).
 * @returns Human-readable USD string without trailing zeros.
 */
export function formatPrice(decimal: string): string {
	// Step 1: Coerce to a Number once. Decimal strings up to 13 significant
	// digits are representable exactly in f64; plan prices are well under that.
	// A non-numeric input lands as NaN, which Intl renders as the locale's NaN
	// token — we fall back to the raw string to avoid "NaN" in the UI.
	const value = Number(decimal);
	if (!Number.isFinite(value)) return decimal;

	// Step 2: Pick the fraction-digit policy. Integer values render without
	// a decimal at all ($25, not $25.00). Non-integer values render two
	// digits — this is deliberate: "$9.5" reads as a typo to most users,
	// whereas "$9.50" matches how prices are displayed everywhere else in
	// the app. `minimumFractionDigits: 2` when cents exist also stops
	// "$29.90" from collapsing to "$29.9".
	const fractionDigits = Number.isInteger(value) ? 0 : 2;
	return value.toLocaleString('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: fractionDigits,
		maximumFractionDigits: fractionDigits,
	});
}
