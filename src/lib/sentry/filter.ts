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
	// `use-x-share.ts`; none indicate a defect. Note `already-claimed`
	// collapses the verified/expired/revoked states (see use-x-share.ts:50),
	// which is how a second-tab race surfaces here.
	'core:xshare:already-claimed',
	'core:xshare:question-required',
	'core:xshare:disabled',
	'core:xshare:expired',
	'core:xshare:rate-limited',
	'core:xshare:not-found',

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

// ==========================================
// Browser Noise Patterns
// ==========================================

/**
 * Error messages and synthesized titles from browser extensions, third-party
 * SDKs, and irrelevant browser APIs. Each pattern is a substring check against
 * `getExceptionText()`, which unifies the raw Error message with Sentry's
 * synthesized title for non-Error promise rejections.
 *
 * Exported so `Sentry.init({ ignoreErrors })` can use the same list as a
 * defence-in-depth prefilter — `InboundFilters` drops matching events before
 * event assembly, which is strictly cheaper than the `beforeSend` fallback
 * below. We keep both layers: `ignoreErrors` catches the common case, and
 * `beforeSend` still matches via `event.exception.values[0].value` in case
 * the filter integration ever misses the synthesized-title code path.
 */
export const BROWSER_NOISE_PATTERNS: readonly string[] = [
	// Framework/browser API false-positives — benign, papered over upstream
	'ResizeObserver loop',
	'ChunkLoadError',
	'Loading chunk',

	// Browser fetch API — network-level failure before the server responds.
	// Fires as an unhandled rejection from Next.js server action internals
	// even when app code catches the error (see RAFLI-F). The user sees a
	// toast; this event is not actionable. Server-side network errors are
	// already sampled at 10% via NETWORK_ERROR_CODES above.
	'Failed to fetch',

	// Browser extensions — user-installed code we don't ship or control
	'extension://',
	'moz-extension://',
	'chrome-extension://',

	// MS Office / Outlook browser extension — injects a global handler that
	// raises "Object Not Found Matching Id:N, MethodName:update, ParamCount:4"
	// from content scripts unrelated to the app. Known Stack Overflow noise:
	// https://stackoverflow.com/questions/72141502
	'Object Not Found Matching Id',

	// Safari/Firefox private mode: `localStorage.getItem`/`window.localStorage`
	// throw a `SecurityError` with this exact message. Wallet connectors
	// (`@metamask/sdk`, Coinbase Wallet SDK) access storage eagerly and don't
	// catch — the throws surface here even though the surrounding flow continues
	// normally once the user grants permission or exits private mode.
	'The operation is insecure',

	// Chrome/Android equivalent of the above — same `SecurityError`, different
	// message. Fires in embedded WebViews (Telegram, Instagram, Twitter in-app
	// browsers) where localStorage is sandboxed. Wagmi's wallet connectors
	// trigger it during session restore. See Sentry RAFLI-B, RAFLI-C.
	'Access is denied for this document',

	// Injected MetaMask provider (`scripts/inpage.js`) throws when the user
	// doesn't have the extension installed — wagmi's connector probing
	// catches internally, but the unhandled rejection still escapes to
	// Sentry's global handler. Users without a wallet aren't a real bug.
	'MetaMask extension not found',
	'Failed to connect to MetaMask',

	// Sentry's synthesized title for plain-object promise rejections whose
	// shape matches EIP-1193 provider errors (`{ code, message }`). Wagmi's
	// connector probing surfaces these during early Web3 initialization on
	// the browse page; without an Error stack there's no actionable context,
	// so we drop the whole group. See Sentry RAFLI-A.
	'Object captured as promise rejection with keys: code, message',

	// wagmi hooks throw when a component renders outside WagmiProvider.
	// We historically saw this during wallet-provider initialization races
	// and extension probing. It's not actionable on its own, and the UI
	// recovers on the next render once the provider tree settles.
	// See Sentry RAFLI-5.
	'WagmiProvider',

	// Injected wallet extension (`app:///inpage.js`) calls
	// `chrome.runtime.sendMessage()` without an extensionId when probing
	// from a webpage context. Chrome throws this exact TypeError into the
	// page's global scope. The message comes from the extension runtime, not
	// from our code — we have no control over which wallet is installed or
	// how it probes. See Sentry RAFLI-M.
	'chrome.runtime.sendMessage() called from a webpage must specify an Extension ID',

	// `inpage.js` is the canonical filename for wallet-extension content
	// scripts (MetaMask, Phantom, Rabby, Coinbase Wallet). Any error whose
	// stack resolves there is extension-origin — e.g. `removeListener`
	// called on `undefined` during provider teardown when the user
	// navigates away. Matches Sentry's title format `at inpage.js:…`.
	// See Sentry RAFLI-N.
	'inpage.js',

	// Safari's generic message for a fetch that aborted before the response
	// headers arrived — user navigated away, backgrounded the tab, or
	// dropped the network. Safari does not surface a richer reason, so
	// there is no actionable context. See Sentry RAFLI-Q.
	'Load failed',

	// Reown AppKit / WalletConnect call Telegram's `postEvent` bridge to
	// detect whether the page is running inside a Telegram Mini App. Outside
	// of Telegram the bridge responds with `Method not found`, which the
	// SDK surfaces as an unhandled rejection. Environmental, not a bug in
	// our code — we don't ship Telegram integration. See Sentry RAFLI-R.
	'Error invoking postEvent: Method not found',

	// `@walletconnect/ethereum-provider` throws this when the user closes
	// the wallet-selection modal without picking an account, or when a
	// provider returns an empty `accounts` array during the
	// `wallet_requestPermissions` exchange. User-cancellation path, not a
	// defect. See Sentry RAFLI-T.
	'Unsupported or empty accounts for namespace',

	// TronLink wallet extension throws `"'set' on proxy: trap returned
	// falsish for property 'tronlinkParams'"` from its injected content
	// script during window probing. `tronlinkParams` is a TronLink-exclusive
	// identifier (defined in the TRON Developer Hub as the `window.tronLink`
	// interface type) — unlike the extension's content-script path
	// `injected/injected.js`, which is shared with unrelated extensions
	// (Better Pronote, SAP Build Process Automation). Anchoring on the
	// property name instead of the path gives precise attribution without
	// collateral-drop risk. Also runs in Sentry's cheaper `ignoreErrors`
	// prefilter via `BROWSER_NOISE_PATTERNS` export. See Sentry RAFLI-18.
	'tronlinkParams',
];

// ==========================================
// Stack-Frame Noise Patterns
// ==========================================

/**
 * Filename / abs_path substrings that mark an event as originating entirely
 * inside third-party code we do not ship and cannot patch.
 *
 * Why a separate bucket from `BROWSER_NOISE_PATTERNS`:
 *
 * `BROWSER_NOISE_PATTERNS` matches the exception message (via
 * `getExceptionText`), which covers the common case where the third-party
 * SDK throws a recognisable string. But some extensions (notably wallet
 * `inpage.js` content scripts) throw generic messages like
 * `"Cannot read properties of undefined (reading 'removeListener')"` whose
 * text is indistinguishable from a genuine app bug — the only tell is the
 * stack frame's filename. See Sentry RAFLI-N, where the production
 * exception value was exactly that and the filter let it through because
 * `inpage.js` lives only in `event.exception.values[].stacktrace.frames[].filename`.
 *
 * Sentry's `InboundFilters` integration reads `ignoreErrors` against the
 * message only, so this layer can't be collapsed into `Sentry.init`'s
 * options — it must run inside `beforeSend` where the full event is
 * available.
 */
export const NOISY_STACK_FRAME_PATTERNS: readonly string[] = [
	// Wallet extensions (MetaMask, Phantom, Rabby, Coinbase Wallet, Rainbow,
	// Brave Wallet) inject `inpage.js` as a content script into every page.
	// Stack frames resolve to `app:///inpage.js` under our release tag with
	// zero visibility into the extension's version or config. Users without
	// a wallet are not a bug, and we cannot patch code we don't ship. See
	// RAFLI-N (removeListener on undefined) and the broader RAFLI-M/N series.
	'inpage.js',

	// Generic browser-extension URL schemes — Chromium, Firefox, Safari.
	// We ship no browser extensions; any frame resolving to these schemes
	// is extension-origin by definition and cannot be a defect in our code.
	'chrome-extension://',
	'moz-extension://',
	'safari-extension://',
	'safari-web-extension://',
];

/**
 * Returns true when the event's stack contains at least one frame whose
 * filename or abs_path matches a third-party noise pattern.
 *
 * Iterates every `exception.values[].stacktrace.frames[]` because wallet
 * and extension errors are often wrapped multiple layers deep — the
 * top-most frame can be an anonymous closure (`<anonymous>` / Array.forEach)
 * while the true origin `inpage.js` sits further down the stack.
 *
 * Performance note: this runs on every non-expected, non-network,
 * non-message-noise event, so we short-circuit on the first match and
 * keep the pattern list small. Empty frames array is cheap — a typical
 * stack has <30 frames.
 *
 * @param event - The Sentry error event
 * @returns `true` if any frame filename/abs_path matches a noise pattern
 */
function hasNoisyStackFrame(event: ErrorEvent): boolean {
	const values = event.exception?.values;
	if (!values) return false;

	for (const exceptionValue of values) {
		const frames = exceptionValue.stacktrace?.frames;
		if (!frames) continue;

		for (const frame of frames) {
			// Sentry SDK sets `filename` for source-mapped stack frames and
			// `abs_path` for the pre-symbolication URL. Extension frames
			// typically only have `abs_path` populated (the `chrome-extension://`
			// URL), while bundled `inpage.js` frames have both. Check both.
			const candidates = [frame.filename, frame.abs_path];
			for (const candidate of candidates) {
				if (!candidate) continue;
				for (const pattern of NOISY_STACK_FRAME_PATTERNS) {
					if (candidate.includes(pattern)) return true;
				}
			}
		}
	}

	return false;
}

/** Keep 10% of network/timeout errors — enough to detect trends without quota spam */
const NETWORK_SAMPLE_RATE = 0.1;

/** Network/timeout error codes that get sampled instead of fully reported */
const NETWORK_ERROR_CODES = new Set([
	'network_error',
	'timeout_error',
	'connection_aborted',
]);

/**
 * Message substrings that we sample rather than drop outright.
 *
 * Use this bucket for errors that are almost certainly noise but where a
 * small constant stream of samples is worth keeping so a genuine
 * regression doesn't hide behind the filter. A matched event is kept
 * with probability `SUSPECTED_NOISE_SAMPLE_RATE` and fingerprinted into
 * a single Sentry issue so the quota cost stays flat.
 *
 * `Maximum call stack size exceeded` — iOS Chrome surfaces this from
 * deep-stacked async work with a useless synthesized frame
 * (`undefined:28`), seen once on `/sign-in` after magic-link submit
 * (Sentry RAFLI-S). Likely Mixpanel autocapture recursion or a Next.js
 * Router internal on an exotic iOS WebKit build — no actionable
 * context. Keeping 10% preserves a signal path if it ever stops being
 * environmental.
 */
const SUSPECTED_NOISE_PATTERNS: readonly string[] = [
	'Maximum call stack size exceeded',
];

/** Keep 10% of suspected-noise events — matches NETWORK_SAMPLE_RATE for consistency */
const SUSPECTED_NOISE_SAMPLE_RATE = 0.1;

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

	// Step 1: Drop expected business/user errors (e.g. invalid credentials, sold out).
	if (errorCode && EXPECTED_ERROR_CODES.has(errorCode)) {
		return null;
	}

	// Step 2: Sample network/timeout errors at 10%, fingerprint into one group
	// to avoid quota exhaustion during transient outages.
	if (errorCode && NETWORK_ERROR_CODES.has(errorCode)) {
		if (Math.random() > NETWORK_SAMPLE_RATE) return null;
		event.fingerprint = ['network-transient'];
		return event;
	}

	// Step 3: Drop browser noise (extensions, known third-party SDKs, plain
	// object promise rejections). `getExceptionText` checks both real Error
	// messages and Sentry's synthesized title for non-Error rejections, so
	// this single pattern list covers both code paths.
	const exceptionMessage = getExceptionText(event, hint);

	if (
		BROWSER_NOISE_PATTERNS.some(pattern => exceptionMessage.includes(pattern))
	) {
		return null;
	}

	// Step 4: Drop events whose stack frames originate in known-noisy
	// third-party code even when the exception message itself is generic.
	// Wallet extensions (`inpage.js`) and browser-extension schemes throw
	// messages like "Cannot read properties of undefined (reading
	// 'removeListener')" — indistinguishable from a real app bug by text,
	// but the stack frame filename is always the giveaway. See RAFLI-N.
	if (hasNoisyStackFrame(event)) {
		return null;
	}

	// Step 5: Sample suspected-noise patterns — errors that look
	// environmental but where a trickle of samples is worth keeping so a
	// hidden regression can still surface. Fingerprint collapses the
	// samples into a single Sentry issue so quota stays flat.
	const suspectedNoiseMatch = SUSPECTED_NOISE_PATTERNS.find(pattern =>
		exceptionMessage.includes(pattern),
	);
	if (suspectedNoiseMatch) {
		if (Math.random() > SUSPECTED_NOISE_SAMPLE_RATE) return null;
		event.fingerprint = ['suspected-noise', suspectedNoiseMatch];
		return event;
	}

	return event;
}

/**
 * Extracts a matchable message from a Sentry event for noise-pattern checks.
 *
 * Three sources, in priority order:
 * 1. `hint.originalException.message` when the rejection was a real Error —
 *    the common case, direct access to the raw message.
 * 2. `event.exception.values[0].value` — Sentry's synthesized title for
 *    non-Error rejections. This is the ONLY place where plain-object
 *    rejections (e.g. EIP-1193 wallet errors throwing `{code, message}`)
 *    surface as a matchable string inside `beforeSend`. Without this
 *    fallback, RAFLI-A-style noise would bypass the filter because
 *    `String({code, message})` yields `[object Object]`.
 * 3. Last-resort string coercion — catches scalar rejections like
 *    `Promise.reject('bad')`.
 *
 * @param event - The Sentry error event
 * @param hint - Event hint with the raw `originalException`
 * @returns Best-effort string representation of the underlying error
 */
function getExceptionText(event: ErrorEvent, hint: EventHint): string {
	if (hint.originalException instanceof Error) {
		return hint.originalException.message;
	}

	const sentryTitle = event.exception?.values?.[0]?.value;
	if (sentryTitle) return sentryTitle;

	return String(hint.originalException ?? '');
}
