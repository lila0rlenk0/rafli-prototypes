const FANBASIS_SDK_ERROR_PREFIX = 'payments:fanbasis-sdk:';

/**
 * Map a Fanbasis SDK error payload to a canonical Sentry error-code tag.
 *
 * The React SDK currently forwards two shapes through `onError`:
 * - constructed `PaymentError` instances from config/init failures (`code`)
 * - raw iframe postMessage payloads from payment/form failures (`errorCode`
 *   or `data.errorCode`)
 *
 * We read both without importing `@fanbasis/checkout-core` directly, keeping
 * the React package as the only Fanbasis dependency at the component boundary.
 *
 * @param error - Caught value from `<AutoCheckout>` `onError`
 * @returns Namespaced Fanbasis SDK code, or `unknown_error` for unknown shapes
 */
export function deriveFanbasisSdkErrorCode(error: unknown): string {
	const code = pickFanbasisSdkCode(error);
	if (code === null) return 'unknown_error';
	return `${FANBASIS_SDK_ERROR_PREFIX}${normalizeFanbasisSdkCode(code)}`;
}

function pickFanbasisSdkCode(error: unknown): null | string {
	if (!isRecord(error)) return null;

	// Config/init failures are `PaymentError`-like objects with a `code`
	// field (`CREATOR_ID_REQUIRED`, `CHECKOUT_SESSION_SECRET_REQUIRED`, ...).
	const directCode = pickString(error, 'code');
	if (directCode !== null) return directCode;

	// Some iframe errors arrive as a flat payload. Preserve that upstream
	// signal instead of collapsing every failed card attempt into unknown.
	const flatErrorCode = pickString(error, 'errorCode');
	if (flatErrorCode !== null) return flatErrorCode;

	// Form submission errors use `{ data: { errorCode } }`; support the
	// nested shape because Fanbasis exposes it in the event API.
	const data = error.data;
	if (!isRecord(data)) return null;
	return pickString(data, 'errorCode');
}

function pickString(
	record: Readonly<Record<string, unknown>>,
	key: string,
): null | string {
	const value = record[key];
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

function normalizeFanbasisSdkCode(code: string): string {
	return code.toLowerCase().replaceAll('_', '-');
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
	return value !== null && typeof value === 'object';
}
