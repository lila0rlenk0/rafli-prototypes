import { AxiosError } from 'axios';

import {
	type AdminKycErrorCode,
	type AuthErrorCode,
	type ChatErrorCode,
	type CheckoutOrderErrorCode,
	type CommentErrorCode,
	COMMON_ERROR_CODES,
	type FanbasisPublicCreditErrorCode,
	type HostErrorCode,
	type KycSubmissionErrorCode,
	type NotificationErrorCode,
	type OrderErrorCode,
	type PaymentErrorCode,
	type PromoCodeErrorCode,
	type RaffleErrorCode,
	type ReportErrorCode,
	type WalletErrorCode,
	type ReviewErrorCode,
	type SubscriptionErrorCode,
	type TicketErrorCode,
	type UpdateErrorCode,
	type VerificationErrorCode,
	type WinningErrorCode,
} from '@/types/errors';

/**
 * Error Mapper Utilities
 *
 * Maps backend error codes to frontend error codes with proper fallbacks.
 *
 * Backend errors come in RFC 7807 ProblemDetails format:
 * - `type`: URN like "urn:raffles:problem:auth:user:invalid-credentials"
 * - Extracted code: "auth:user:invalid-credentials"
 *
 * Error code prefixes indicate source:
 * - `global:*`   → Backend cross-cutting middleware (rate limit, auth guard, uploads)
 * - `auth:*`     → Backend authentication service
 * - `core:*`     → Backend core business logic
 * - `payments:*` → Backend payments service
 * - `snake_case` → Frontend-only (network errors, HTTP status fallbacks)
 */

// Hoisted RegExp — avoid re-creation on every extractErrorCode call
const RE_URN_PREFIX = /^urn:raffles:problem:(.+)$/;

/**
 * Only treat `message` as a transport for machine codes when it matches a known
 * domain prefix — arbitrary "foo: bar" user-facing text is not a code (injection mitigated)
 */
const MESSAGE_AS_ERROR_CODE_PREFIXES: readonly string[] = [
	'global:',
	'auth:',
	'core:',
	'payments:',
	'admin:',
	'promo:',
	'chat:',
	'moderation:',
];

/**
 * Extracts error code from backend RFC 7807 response
 *
 * Handles multiple response formats:
 * 1. RFC 7807 `type` field (URN) → extracts code after "urn:raffles:problem:"
 * 2. `message` field containing colon-separated code
 * 3. Simple `code` field
 *
 * @param error - Axios error with response data
 * @returns Extracted error code or null
 */
function extractErrorCode(error: unknown): string | null {
	// Step 1: Ensure Axios error with response data.
	if (!(error instanceof AxiosError) || !error.response?.data) {
		return null;
	}

	const data = error.response.data;

	// Step 2: Try RFC 7807 'type' field (e.g. "urn:raffles:problem:auth:user:invalid-credentials").
	// Returns: "auth:user:invalid-credentials"
	if (data.type && typeof data.type === 'string') {
		const urnMatch = data.type.match(RE_URN_PREFIX);
		if (urnMatch) {
			return urnMatch[1];
		}
	}

	// Step 3: Try 'message' field with colon-separated code (e.g. "auth:user:invalid-credentials").
	// (Some endpoints return code in message field)
	if (data.message && typeof data.message === 'string') {
		const t = data.message.trim();
		if (MESSAGE_AS_ERROR_CODE_PREFIXES.some(prefix => t.startsWith(prefix))) {
			return t;
		}
	}

	// Step 4: Try simple 'code' field (e.g. "unauthenticated").
	// (Legacy format or simple error codes)
	if (data.code && typeof data.code === 'string') {
		return data.code;
	}

	return null;
}

/** Hoisted to module scope to avoid re-allocation on every call */
const SIMPLE_CODE_MAP: Record<string, string> = {
	unauthenticated: 'global:auth:unauthenticated',
	permission_denied: 'forbidden',
	not_found: 'not_found',
	invalid_argument: 'validation_error',
	// better-auth plugin codes — uppercase shorthand the plugins return verbatim
	// in `data.code`. Routed to canonical `auth:*` codes so domain mappers route them.
	// Captcha codes mirror the Encore-boundary `verifyTurnstile` URNs so the
	// shorthand path (better-auth catch-all) and the typed path resolve to the
	// same FE constants.
	PASSWORD_COMPROMISED: 'auth:password:compromised',
	VERIFICATION_FAILED: 'auth:captcha:invalid',
	MISSING_RESPONSE: 'auth:captcha:missing',
};

/**
 * Normalizes simple backend codes to their full qualified equivalents.
 * Some endpoints return shorthand codes like "unauthenticated" instead of
 * "global:auth:unauthenticated" — this maps those to canonical form so
 * prefix-based routing in domain mappers works correctly.
 *
 * @param code - Raw code from backend response
 * @returns Normalized code, or original if no mapping exists
 */
function mapSimpleCode(code: string): string {
	return SIMPLE_CODE_MAP[code] || code;
}

/**
 * Maps network/HTTP errors to frontend-only error codes
 *
 * Called when:
 * 1. No backend error code could be extracted
 * 2. Request failed before reaching backend (network error)
 * 3. Backend returned HTTP status without specific error code
 *
 * These are frontend-only codes (snake_case) - never from backend.
 *
 * @param error - Axios error
 * @returns Frontend-only CommonErrorCode
 */
function mapCommonError(
	error: unknown,
): (typeof COMMON_ERROR_CODES)[keyof typeof COMMON_ERROR_CODES] {
	if (!(error instanceof AxiosError)) return COMMON_ERROR_CODES.UNKNOWN_ERROR;

	// Step 1: Check transport-only axios error codes — request never reached backend.
	if (error.code === 'ECONNABORTED') return COMMON_ERROR_CODES.TIMEOUT_ERROR;
	if (error.code === 'ERR_NETWORK') return COMMON_ERROR_CODES.NETWORK_ERROR;

	// Step 2: HTTP status fallbacks. Axios labels most 4xx responses as
	// `ERR_BAD_REQUEST`, so status must win over code here or 401/403
	// responses collapse to `validation_error`.
	if (error.response) {
		const { status } = error.response;
		if (status === 400) return COMMON_ERROR_CODES.VALIDATION_ERROR;
		if (status === 401) return COMMON_ERROR_CODES.UNAUTHORIZED;
		if (status === 403) return COMMON_ERROR_CODES.FORBIDDEN;
		if (status === 500) return COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR;
		if (status === 503) return COMMON_ERROR_CODES.SERVICE_UNAVAILABLE;
	}

	// Step 3: Axios produced a bad-request code without a response status.
	if (error.code === 'ERR_BAD_REQUEST')
		return COMMON_ERROR_CODES.VALIDATION_ERROR;

	return COMMON_ERROR_CODES.UNKNOWN_ERROR;
}

/**
 * Factory producing a domain error mapper.
 *
 * Every domain mapper below follows the identical flow:
 *
 *   1. Call `extractErrorCode(error)` to read the RFC 7807 `type`/`message`/`code`.
 *   2. If the extracted code starts with one of the domain's accepted prefixes,
 *      return it as-is (it's already a canonical backend code).
 *   3. Otherwise normalize shorthand codes via `mapSimpleCode` (e.g. the backend
 *      sometimes returns bare "unauthenticated" instead of the full
 *      "global:auth:unauthenticated") and re-check prefixes.
 *   4. If nothing matched, fall through to `mapCommonError` for network /
 *      HTTP-status based frontend error codes.
 *
 * The only per-domain variation is the list of accepted prefixes — so we
 * parameterize just that. The return type is the union of `CommonErrorCode`
 * (the fallback) and the domain-specific code type supplied by the caller;
 * the factory itself only handles strings at runtime and relies on the caller
 * to supply the correct `E` generic.
 *
 * Note on style: the factory returns a function value, so each domain mapper
 * is declared as `export const mapXError = createDomainErrorMapper(...)` —
 * one of the few places in the codebase where a top-level `export const`
 * function is the only sensible shape. Downstream call sites are unaffected
 * because they import mappers by name.
 *
 * @param prefixes - Prefix list the domain accepts from backend codes. Order
 *   doesn't matter; `startsWith` is O(prefix count) per check which is trivial.
 * @returns A mapper function that preserves identical behavior to the
 *   hand-rolled per-domain mappers it replaces.
 */
function createDomainErrorMapper<E extends string>(
	prefixes: readonly string[],
): (error: unknown) => E | CommonErrorCode {
	return function mapDomainError(error: unknown): E | CommonErrorCode {
		// Step 1: Pull the backend's RFC 7807 error code (or null if absent).
		const extractedCode = extractErrorCode(error);

		if (extractedCode) {
			// Step 2: Direct prefix match — backend returned a fully-qualified code.
			if (hasAcceptedPrefix(extractedCode, prefixes)) {
				return extractedCode as E;
			}

			// Step 3: Normalize shorthand ("unauthenticated" → "global:auth:unauthenticated")
			// and retry the prefix check. Only accept if the mapping actually changed
			// the string into something matching — otherwise we'd double-check the same
			// value.
			const mappedCode = mapSimpleCode(extractedCode);
			if (hasAcceptedPrefix(mappedCode, prefixes)) {
				return mappedCode as E;
			}
		}

		// Step 4: No backend code matched — fall through to network/HTTP fallbacks.
		return mapCommonError(error);
	};
}

/**
 * Returns true when `code` starts with any of the accepted prefixes. Extracted
 * so the two prefix checks in `createDomainErrorMapper` stay identical.
 */
function hasAcceptedPrefix(code: string, prefixes: readonly string[]): boolean {
	for (const prefix of prefixes) {
		if (code.startsWith(prefix)) return true;
	}
	return false;
}

// CommonErrorCode alias — the frontend-only fallback union returned by
// `mapCommonError`. Kept local so `createDomainErrorMapper`'s generic return
// type stays self-contained and we don't leak a new name into the errors barrel.
type CommonErrorCode = ReturnType<typeof mapCommonError>;

/**
 * Maps authentication errors to AuthErrorCode.
 * Accepts backend `auth:*` and `global:*` prefixes; falls back to CommonErrorCode.
 */
export const mapAuthError = createDomainErrorMapper<AuthErrorCode>([
	'auth:',
	'global:',
]);

/**
 * Maps raffle/core errors to RaffleErrorCode.
 * Accepts backend `core:*` and `global:*` prefixes; falls back to CommonErrorCode.
 */
export const mapRaffleError = createDomainErrorMapper<RaffleErrorCode>([
	'core:',
	'global:',
]);

/**
 * Maps order errors to OrderErrorCode.
 * Accepts `core:order:*`, `core:raffle:*`, and `global:*` prefixes — orders
 * can surface raffle-level failures like sold-out, so both core namespaces
 * are included deliberately (do NOT collapse to plain `core:`).
 */
export const mapOrderError = createDomainErrorMapper<OrderErrorCode>([
	'core:order:',
	'core:raffle:',
	'global:',
]);

/**
 * Maps errors from the atomic `/orders/checkout` endpoint.
 * That endpoint validates and redeems a promo code inside the order
 * transaction, so it can surface the full `core:promo:*` namespace alongside
 * order / raffle errors. Using `mapOrderError` there silently collapses
 * promo codes into `validation_error`, breaking the `shouldClearPromo` UX.
 */
export const mapCheckoutOrderError =
	createDomainErrorMapper<CheckoutOrderErrorCode>([
		'core:order:',
		'core:raffle:',
		'core:promo:',
		'global:',
	]);

/**
 * Maps wallet errors to WalletErrorCode.
 * Accepts `auth:wallet:*` and `global:*` — wallets live under the auth backend
 * module, so only the wallet sub-namespace is honored (do NOT expand to `auth:`).
 */
export const mapWalletError = createDomainErrorMapper<WalletErrorCode>([
	'auth:wallet:',
	'global:',
]);

/**
 * Maps payment errors to PaymentErrorCode.
 * Accepts `payments:*`, `core:*`, and `global:*` — crypto checkout can surface
 * `core:order:*` errors through the payments flow, so the broad `core:` prefix
 * is intentional.
 */
export const mapPaymentError = createDomainErrorMapper<PaymentErrorCode>([
	'payments:',
	'core:',
	'global:',
]);

/**
 * Maps Fanbasis public-credit checkout errors to FanbasisPublicCreditErrorCode.
 *
 * Accepts only `payments:fanbasis:*` and `global:*` — this endpoint is the
 * unauthenticated landing-page promo, so we deliberately do NOT open the map to
 * the full `payments:*` namespace the authenticated flow uses. The broad
 * surface would let unrelated Stripe/crypto URNs leak into a toast intended for
 * the promo checkout and silently widen the allowed code set in a way
 * reviewers would miss. Errors outside the accepted prefixes fall through to
 * CommonErrorCode (network / HTTP-status fallbacks), which already covers the
 * network-level failure modes this service cares about.
 */
export const mapFanbasisPublicCreditError =
	createDomainErrorMapper<FanbasisPublicCreditErrorCode>([
		'payments:fanbasis:',
		'global:',
	]);

/**
 * Maps ticket errors to TicketErrorCode.
 * Accepts `core:*` and `global:*` prefixes.
 */
export const mapTicketError = createDomainErrorMapper<TicketErrorCode>([
	'core:',
	'global:',
]);

/**
 * Maps host errors to HostErrorCode.
 *
 * The `/users/:id` public-profile endpoint is served by the authentication
 * service — its not-found URN is `auth:profile:not-found`, which is the only
 * `auth:*` code host endpoints surface. We narrow the accepted prefix to
 * `auth:profile:` (rather than the broader `auth:`) so the global
 * `SIMPLE_CODE_MAP` rewrites — `VERIFICATION_FAILED` →
 * `auth:captcha:invalid`, `MISSING_RESPONSE` → `auth:captcha:missing` — cannot
 * leak through and pollute HostErrorCode with strings that are not in its
 * union. Dropping the auth surface entirely (as the original revision did)
 * folded real 404s into the `mapCommonError` fallback and masked the
 * backend's domain signal, hence the deliberate sub-namespace.
 */
export const mapHostError = createDomainErrorMapper<HostErrorCode>([
	'auth:profile:',
	'core:',
	'global:',
]);

/**
 * Maps winning errors to WinningErrorCode.
 * Accepts `core:*` and `global:*` prefixes.
 */
export const mapWinningError = createDomainErrorMapper<WinningErrorCode>([
	'core:',
	'global:',
]);

/**
 * Maps update errors to UpdateErrorCode.
 * Accepts `core:*` and `global:*` prefixes.
 */
export const mapUpdateError = createDomainErrorMapper<UpdateErrorCode>([
	'core:',
	'global:',
]);

/**
 * Maps verification errors to VerificationErrorCode.
 *
 * Accepts `core:`, `ledger:`, and `global:` prefixes. The public verify-ticket
 * endpoint returns `ledger:ticket:not-found` for the unknown-code 404 —
 * routing it through `core:` alone collapsed it into `unknown_error` and the
 * user saw a generic "something went wrong" instead of "ticket not found".
 */
export const mapVerificationError =
	createDomainErrorMapper<VerificationErrorCode>([
		'core:',
		'ledger:',
		'global:',
	]);

/**
 * Maps notification errors to NotificationErrorCode.
 * Accepts `core:*` and `global:*` prefixes.
 */
export const mapNotificationError =
	createDomainErrorMapper<NotificationErrorCode>(['core:', 'global:']);

/**
 * Maps chat errors to ChatErrorCode.
 * Accepts `chat:*` (conversation/message/room/ws/attachment URNs) and
 * `global:*` (rate-limit, upload, auth middleware) prefixes.
 */
export const mapChatError = createDomainErrorMapper<ChatErrorCode>([
	'chat:',
	'global:',
]);

/**
 * Maps review errors to ReviewErrorCode.
 * Accepts `core:*` and `global:*` prefixes.
 */
export const mapReviewError = createDomainErrorMapper<ReviewErrorCode>([
	'core:',
	'global:',
]);

/**
 * Maps comment errors to CommentErrorCode.
 * Accepts `core:*` and `global:*` prefixes.
 */
export const mapCommentError = createDomainErrorMapper<CommentErrorCode>([
	'core:',
	'global:',
]);

/**
 * Maps report errors to ReportErrorCode.
 * Accepts `moderation:*` and `global:*` — reports live in a separate moderation
 * module on the backend, so `core:` is deliberately NOT accepted.
 */
export const mapReportError = createDomainErrorMapper<ReportErrorCode>([
	'moderation:',
	'global:',
]);

/**
 * Maps promo code errors to PromoCodeErrorCode.
 * Accepts `core:*` and `global:*` prefixes.
 */
export const mapPromoCodeError = createDomainErrorMapper<PromoCodeErrorCode>([
	'core:',
	'global:',
]);

/**
 * Maps subscription errors to SubscriptionErrorCode.
 * Accepts `payments:subscription:*` and `global:*` prefixes — the subscription
 * domain is nested under the payments service on the backend, but the pricing
 * page never surfaces non-subscription payments errors, so we deliberately do
 * NOT open this up to the whole `payments:*` namespace.
 */
export const mapSubscriptionError =
	createDomainErrorMapper<SubscriptionErrorCode>([
		'payments:subscription:',
		'global:',
	]);

/**
 * Maps KYC submission errors to KycSubmissionErrorCode.
 * Accepts `core:*` and `global:*` prefixes (KYC codes live under `core:verification:*`).
 */
export const mapKycSubmissionError =
	createDomainErrorMapper<KycSubmissionErrorCode>(['core:', 'global:']);

/**
 * Maps admin KYC review errors to AdminKycErrorCode.
 *
 * Delegates to `mapKycSubmissionError` because AdminKycErrorCode and
 * KycSubmissionErrorCode share the same backend module (`core:verification:*`)
 * and the same CommonErrorCode fallback union — the extraction logic is
 * literally identical. A direct cast is sound because every string the
 * delegated mapper can return already exists in AdminKycErrorCode.
 *
 * @param error - Caught error (usually AxiosError)
 * @returns AdminKycErrorCode (either backend code or frontend fallback)
 */
export function mapAdminKycError(error: unknown): AdminKycErrorCode {
	// Cast sound: KycSubmissionErrorCode and AdminKycErrorCode are structurally
	// identical (same backend module + same CommonErrorCode fallback).
	return mapKycSubmissionError(error) as AdminKycErrorCode;
}
