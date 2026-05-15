/**
 * User/business-path error codes — dropped by beforeSend (quota).
 * Keep in sync with `capture.ts` (shouldCaptureServiceError).
 */

export const EXPECTED_ERROR_CODES = new Set<string>([
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
	// Captcha — Cloudflare Turnstile token rejection / missing header / upstream
	// fail-closed. User retries on the same form; not a defect.
	'auth:captcha:invalid',
	'auth:captcha:missing',
	'auth:captcha:unavailable',
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
	'global:validation:invalid-payload',

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

	// X-share free-ticket claim — two-step intent → verify flow. Every code
	// is a backend-enforced business rule with a mapped toast in
	// `verify-errors.ts` / `intent-errors.ts`; none indicate a defect.
	// Backend collapsed the claim enum to `pending | verified`, but
	// `cooldown` is still raised on the verify endpoint to throttle the
	// lax-review retry budget (see `verify-x-share.ts` schema:
	// `pending_review.retryAfterSeconds`). `already-claimed` means a
	// verified claim already exists for this (raffle, user) pair.
	'core:xshare:already-claimed',
	'core:xshare:question-required',
	'core:xshare:disabled',
	'core:xshare:expired',
	'core:xshare:not-found',
	// Server-enforced retry throttle inside the lax-review window — every
	// hit had been burning Sentry quota until added (production RAFLI-1X).
	'core:xshare:cooldown',

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

	// Subscription — user/business errors surfaced by /subscriptions/*.
	// `checkout-failed` and `enrollment-conflict` are included here because
	// both are raised when Stripe rejects the request (card declined,
	// duplicate webhook race) — provider/user-side failures, not defects.
	'payments:subscription:plan-not-found',
	'payments:subscription:already-subscribed',
	'payments:subscription:checkout-failed',
	'payments:subscription:not-found',
	'payments:subscription:not-active',
	'payments:subscription:enrollment-conflict',
	// Provider-lock guard — tampered request, never organic; FE gates the CTA, this is the safety net.
	'payments:subscription:provider-locked',
	// Target plan not subscribable on the user's locked rail — same shape as
	// `provider-locked`: FE's `pickSubscribeProvider` gate should prevent the
	// click, so reaching here means a stale catalogue or a tampered request.
	// Not a defect.
	'payments:subscription:provider-not-supported',
	// Portal — user has no Stripe customer; expected for never-subscribed
	// accounts that somehow reach the manage flow. UI deflects to /pricing.
	'payments:subscription:no-customer',
	// Change-plan + scheduled-change race codes. All four are organic user
	// states — clicked stale UI, double-tabbed, raced phase[1] auto-apply,
	// CAS race between two requests. The FE has direct UI handling for each
	// (refetch + targeted copy), so Sentry stays out of the loop on quota.
	'payments:subscription:pending-change-exists',
	'payments:subscription:pending-change-already-applied',
	'payments:subscription:no-pending-change',
	'payments:subscription:invalid-plan-change',
	'payments:subscription:plan-change-conflict',

	// Fanbasis — the public-credit checkout endpoint is unauthenticated and
	// BE deliberately collapses three cases onto the same `checkout-failed`
	// URN: genuine upstream failure, existing-email account-enumeration
	// shield, and per-IP daily-cap exhaustion (see BE commit `dff5424f`).
	// The first two are organic user actions the FE can't tell apart, so
	// `checkout-failed` stays expected — real upstream outages surface via
	// BE logs and Fanbasis-side alerting, not Sentry. `rate-limited` is the
	// authenticated-surface 429 bucket; users retry on the same form.
	// `cancel-failed` is left OUT — that one is unambiguously an upstream
	// API rejection on a logged-in cancel flow and on-call should see it.
	'payments:fanbasis:checkout-failed',
	'payments:fanbasis:rate-limited',

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

	// Host — expected lookup failures (served by the auth service)
	'auth:profile:not-found',

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

	// Chat — business rules surfaced via backend URNs. Every code here is
	// user/environmental: membership checks, rate-limits, attachment races,
	// WS token exhaustion. Real defects (500, contract drift) stay off this
	// list and still flow to Sentry.
	'chat:conversation:not-found',
	'chat:conversation:not-member',
	'chat:conversation:permission-denied',
	'chat:conversation:invalid-member-count',
	'chat:conversation:invalid-member',
	'chat:conversation:daily-limit-reached',
	'chat:conversation:max-members',
	'chat:conversation:already-member',
	'chat:conversation:max-members-below-current',
	'chat:message:not-found',
	'chat:message:deleted',
	'chat:message:permission-denied',
	'chat:message:edit-window-expired',
	'chat:message:invalid-body',
	'chat:message:invalid-type',
	'chat:message:invalid-attachment',
	'chat:room:not-found',
	'chat:room:read-only',
	'chat:room:full',
	'chat:ws:invalid-token',
	'chat:ws:max-connections',
	'chat:ws:token-service-unavailable',
	'chat:attachment:pending-limit-reached',
	'chat:user:not-found',
	'chat:validation:failed',
]);
