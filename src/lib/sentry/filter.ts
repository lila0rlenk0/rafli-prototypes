import type { ErrorEvent, EventHint } from '@sentry/nextjs';

// ==========================================
// Expected Error Codes
// ==========================================

/**
 * Error codes that represent expected user/business-rule errors.
 * These are dropped by `beforeSend` to avoid quota spam.
 *
 * Any error code NOT in this set passes through to Sentry.
 */
const EXPECTED_ERROR_CODES = new Set<string>([
	// Auth — user mistakes (credentials, validation, expected states)
	'auth:user:invalid-credentials',
	'auth:user:already-exists',
	'auth:user:not-found',
	'auth:user:already-host',
	'auth:email:invalid',
	'auth:token:expired',
	'auth:token:invalid',
	'auth:signup:failed',
	'auth:password:compromised',
	'auth:password:not-set',
	'auth:password:invalid',
	'auth:password:same',
	'auth:password-reset:failed',
	'auth:social:failed',
	'auth:social:provider-error',
	'auth:social:callback-failed',
	'auth:social:token-exchange-failed',
	'auth:session:expired',
	'auth:session:invalid',
	'auth:permission:denied',

	// Auth — profile/account (user-triggered states)
	'auth:username:taken',
	'auth:username:invalid',
	'auth:bio:too-long',
	'auth:profile:not-found',
	'auth:account:already-deleted',
	'auth:account:deleted',
	'auth:account:deletion-blocked',

	// Wallet — signature/validation
	'auth:wallet:not-verified',
	'auth:wallet:signature-invalid',
	'auth:wallet:invalid-signature',
	'auth:wallet:signature-expired',
	'auth:wallet:invalid-timestamp',
	'auth:wallet:limit-reached',
	'auth:wallet:message-mismatch',
	'auth:wallet:invalid-address',
	'auth:wallet:not-found',
	'auth:wallet:validation-failed',

	// Common — user/client errors and auth guards
	'validation_error',
	'unauthorized',
	'forbidden',
	'session_expired',
	'invalid_request',
	'global:auth:unauthenticated',

	// Global — rate limiting, upload validation
	'global:ratelimit:exceeded',
	'global:upload:file-too-large',
	'global:upload:invalid-image',
	'global:upload:invalid-file-type',
	'global:upload:invalid-content-type',
	'global:upload:missing-boundary',
	'global:upload:no-file',
	'global:validation:invalid-argument',

	// Raffle — business rules
	'core:raffle:not-found',
	'core:raffle:permission-denied',
	'core:raffle:invalid-dates',
	'core:raffle:not-draft',
	'core:raffle:not-cancellable',
	'core:raffle:not-queued',
	'core:raffle:missing-fields',
	'core:raffle:min-participants-must-exceed-winners',
	'core:raffle:not-active',
	'core:raffle:sold-out',
	'core:raffle:user-ticket-limit-exceeded',
	'core:raffle:not-live',
	'core:raffle:not-fulfilling',
	'core:raffle:not-commentable',
	'core:raffle:question-not-found',
	'core:raffle:invalid-crypto-config',
	'core:gallery:limit-exceeded',
	'core:option:not-found',
	'core:option:invalid',

	// Order — expected states
	'core:order:not-found',
	'core:order:permission-denied',
	'core:order:invalid-quantity',
	'core:order:already-completed',
	'core:order:question-not-answered',
	'core:order:not-pending',

	// Payment — expected user/business errors
	'payments:order:permission-denied',
	'payments:order:not-pending',
	'payments:order:already-paid',
	'payments:stripe:crypto-session-active',
	'payments:stripe:permission-denied',
	'payments:stripe:session-not-found',
	'payments:crypto:stripe-session-active',
	'payments:crypto:wallet-not-verified',
	'payments:crypto:raffle-not-accepting',
	'payments:crypto:unsupported-chain',
	'payments:crypto:unknown-token',
	'payments:crypto:token-not-on-chain',
	'payments:crypto:chain-not-allowed',
	'payments:crypto:token-not-allowed',
	'payments:crypto:no-token-pricing',
	'payments:crypto:session-expired',
	'payments:crypto:already-completed',
	'payments:crypto:already-confirming',
	'payments:crypto:tx-already-used',
	'payments:crypto:chain-mismatch',
	'payments:crypto:permission-denied',
	'payments:crypto:already-paid',
	'payments:crypto:wallet-mismatch',
	'payments:crypto:invalid-tx-hash',
	'payments:crypto:invalid-wallet',
	'payments:crypto:invalid-amount-format',
	'payments:crypto:invalid-price-format',
	'payments:crypto:invalid-ticket-quantity',
	'payments:crypto:zero-amount',
	'payments:crypto:session-not-found',
	'payments:amount:invalid-format',
	'payments:amount:too-large',
	'payments:abandon:crypto-active',
	'payments:raffle:user-ticket-limit-exceeded',

	// Payment — race conditions (expected under concurrent load)
	'payments:checkout:not-found',
	'payments:checkout:concurrent-completion',
	'payments:crypto:concurrent-update',
	'payments:crypto:concurrent-completion',

	// Credits — expected business errors
	'payments:credits:insufficient-balance',
	'payments:credits:invalid-amount',
	'payments:credits:invalid-order-amount',
	'payments:credits:order-not-found',
	'payments:credits:order-not-pending',
	'payments:credits:not-a-spend-entry',
	'payments:credits:not-found',
	'payments:credits:original-entry-not-found',
	'payments:credits:reversal-not-found',
	'payments:credits:spend-not-found',
	'payments:credits:payment-session-active',

	// Promo — validation/business rules
	'core:promo:not-found',
	'core:promo:not-host',
	'core:promo:invalid-value',
	'core:promo:deactivated',
	'core:promo:expired',
	'core:promo:max-uses-reached',
	'core:promo:already-redeemed',
	'core:promo:host-cannot-redeem',
	'core:promo:question-required',
	'core:promo:raffle-mismatch',
	'core:promo:order-already-discounted',

	// Winning — expected states
	'core:winning:no-winnings',
	'core:winning:invalid-raffle',
	'core:winning:not-found',
	'core:winning:invalid-status',
	'core:winning:not-owner',
	'core:winning:not-claimed',
	'core:winning:permission-denied',
	'core:winning:invalid-state-shape',
	'core:winning:raffle-not-found',

	// Update — expected states
	'core:update:not-found',
	'core:update:permission-denied',
	'core:update:image-limit-exceeded',
	'core:update:image-not-found',

	// Host — expected lookup failures
	'core:user:not-found',

	// Comment — expected states
	'core:comment:not-found',
	'core:comment:parent-not-found',
	'core:comment:already-deleted',
	'core:comment:permission-denied',
	'core:comment:raffle-not-commentable',
	'core:comment:deleted',
	'core:comment:self-vote',
	'core:comment:invalid-body',

	// Verification — expected lookup/state failures
	'core:verification:ticket-not-found',
	'core:verification:winner-not-found',
	'core:verification:proof-not-found',
	'core:verification:raffle-not-completed',
	'core:verification:not-found',

	// KYC submission — expected validation/state errors
	'core:verification:already-pending',
	'core:verification:invalid-purpose',
	'core:verification:document-exists',
	'core:verification:already-finalized',
	'core:verification:not-pending',
	'core:verification:incomplete-documents',
	'core:verification:email-mismatch',
	'core:verification:permission-denied',
	'core:verification:invalid-type',

	// Admin KYC — expected review states
	'core:verification:not-finalized',
	'core:verification:already-reviewed',
	'core:verification:self-review',

	// Report — expected validation
	'moderation:report:raffle-id-required',
	'moderation:report:raffle-id-mismatch',
	'moderation:report:duplicate',
	'moderation:report:validation-failed',

	// Client-side validation
	'client:raffle:invalid-category',
	'client:upload:invalid-type',
	'client:upload:too-large',
	'client:upload:too-many-files',

	// Review — expected states
	'core:review:not-eligible',
	'core:review:already-reviewed',
	'core:review:not-found',

	// Notification — expected states
	'core:notification:not-found',
	'core:notification:validation-failed',

	// Ticket — expected states
	'core:ticket:no-tickets',
	'core:ticket:invalid-raffle',
]);

// ==========================================
// Browser Noise Patterns
// ==========================================

/** Error messages from browser extensions and irrelevant browser APIs */
const BROWSER_NOISE_PATTERNS = [
	'ResizeObserver loop',
	'ChunkLoadError',
	'Loading chunk',
	'extension://',
	'moz-extension://',
	'chrome-extension://',
];

/** Network/timeout error codes that get sampled instead of fully reported */
const NETWORK_ERROR_CODES = new Set([
	'network_error',
	'timeout_error',
	'connection_aborted',
]);

// ==========================================
// Filter
// ==========================================

/**
 * Sentry `beforeSend` filter. Drops expected errors, samples network errors,
 * and filters browser noise to keep quota usage minimal.
 *
 * @param event - Sentry error event
 * @param hint - Event hint with original error
 * @returns Filtered event or null to drop
 */
export function filterEvent(
	event: ErrorEvent,
	hint: EventHint,
): ErrorEvent | null {
	const errorCode = event.tags?.errorCode as string | undefined;

	// Drop expected business/user errors
	if (errorCode && EXPECTED_ERROR_CODES.has(errorCode)) {
		return null;
	}

	// Sample network/timeout errors at 10%, fingerprint into one group
	if (errorCode && NETWORK_ERROR_CODES.has(errorCode)) {
		if (Math.random() > 0.1) return null;
		event.fingerprint = ['network-transient'];
		return event;
	}

	// Drop browser noise
	const message =
		hint.originalException instanceof Error
			? hint.originalException.message
			: String(hint.originalException ?? '');

	if (BROWSER_NOISE_PATTERNS.some(pattern => message.includes(pattern))) {
		return null;
	}

	return event;
}
