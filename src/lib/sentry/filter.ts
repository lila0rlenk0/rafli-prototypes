import type { ErrorEvent, EventHint } from '@sentry/nextjs';

import { EXPECTED_ERROR_CODES } from './expected-error-codes';
export { EXPECTED_ERROR_CODES };

/** Dropped from `contexts.service` in production — wallet/tx correlation mitigated */
const REDACT_SERVICE_CONTEXT_KEYS = [
	'walletAddress',
	'txHash',
	'orderId',
	'submissionId',
] as const;

/** Exported for unit tests — production-only redaction of wallet/tx correlation fields */
export function scrubSensitiveServiceContext(event: ErrorEvent): ErrorEvent {
	if (process.env.NODE_ENV !== 'production') return event;

	const raw = event.contexts?.service as Record<string, unknown> | undefined;
	if (!raw) return event;

	let changed = false;
	const next: Record<string, unknown> = { ...raw };
	for (const key of REDACT_SERVICE_CONTEXT_KEYS) {
		if (next[key] !== undefined) {
			next[key] = '[redacted]';
			changed = true;
		}
	}
	if (!changed) return event;

	return {
		...event,
		contexts: {
			...event.contexts,
			service: next,
		},
	};
}

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
	incoming: ErrorEvent,
	hint: EventHint,
): ErrorEvent | null {
	const errorCode = incoming.tags?.errorCode as string | undefined;

	// Step 1: Drop expected business/user errors (e.g. invalid credentials, sold out).
	if (errorCode && EXPECTED_ERROR_CODES.has(errorCode)) {
		return null;
	}

	const event = scrubSensitiveServiceContext(incoming);

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

	const exceptionValues = event.exception?.values;
	const firstFrame = exceptionValues?.[0];
	const sentryTitle = firstFrame?.value;
	if (sentryTitle) return sentryTitle;

	return String(hint.originalException ?? '');
}
