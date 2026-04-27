import { describe, expect, test } from 'bun:test';
import type { ErrorEvent, EventHint } from '@sentry/nextjs';

import { EXPECTED_ERROR_CODES, filterEvent } from './filter';

/**
 * Creates a minimal Sentry ErrorEvent with optional tags, synthesized
 * exception title, and stack frames. The title goes into
 * `exception.values[0].value` which is how `filterEvent` reads non-Error
 * promise rejections (plain objects, scalars) — the only surface where
 * those rejections are matchable as a string inside `beforeSend`. The
 * `frames` argument attaches a `stacktrace.frames` array on the first
 * exception value so the stack-frame noise filter (RAFLI-N regression)
 * can be exercised without reaching for real Sentry internals.
 */
interface FrameInput {
	readonly filename?: string;
	readonly abs_path?: string;
	readonly function?: string;
}

function createEvent(
	tags?: Record<string, string>,
	exceptionValue?: string,
	frames?: readonly FrameInput[],
): ErrorEvent {
	const event: ErrorEvent = { tags } as ErrorEvent;
	if (exceptionValue !== undefined || frames !== undefined) {
		event.exception = {
			values: [
				{
					value: exceptionValue,
					...(frames ? { stacktrace: { frames: [...frames] } } : {}),
				},
			],
		};
	}
	return event;
}

/**
 * Creates an EventHint wrapping an original exception.
 * filterEvent reads hint.originalException for browser noise matching.
 */
function createHint(originalException?: unknown): EventHint {
	return { originalException } as EventHint;
}

function withRandomValue<T>(value: number, run: () => T): T {
	// Sampling is the behavior under test, but letting real randomness decide
	// pass/fail makes the suite probabilistic. Pin `Math.random()` per case so
	// boundary expectations stay exact and restore immediately to avoid leaking
	// global state into later Sentry tests.
	const originalRandom = Math.random;
	Math.random = () => value;
	try {
		return run();
	} finally {
		Math.random = originalRandom;
	}
}

describe('filterEvent', () => {
	describe('expected business error codes are dropped', () => {
		// Drive coverage from the production Set so every newly whitelisted
		// business code gets a drop assertion automatically. A hand-maintained
		// sample list let Fanbasis codes drift in without filter coverage.
		const expectedCodes = [...EXPECTED_ERROR_CODES].toSorted();

		for (const code of expectedCodes) {
			test(`drops ${code}`, () => {
				const event = createEvent({ errorCode: code });
				const result = filterEvent(event, createHint());
				expect(result).toBeNull();
			});
		}
	});

	describe('unexpected error codes pass through', () => {
		test('passes unknown error code', () => {
			const event = createEvent({ errorCode: 'core:raffle:unknown-thing' });
			const result = filterEvent(event, createHint());
			expect(result).toBe(event);
		});

		test('passes event with no errorCode tag', () => {
			const event = createEvent({});
			const result = filterEvent(event, createHint());
			expect(result).toBe(event);
		});

		test('passes event with no tags', () => {
			const event = createEvent();
			const result = filterEvent(event, createHint());
			expect(result).toBe(event);
		});
	});

	describe('infrastructure errors (5XX) always reach Sentry', () => {
		const infraCodes = [
			'internal_server_error',
			'service_unavailable',
			'unknown_error',
			'payments:checkout:failed',
			'payments:crypto:submit-failed',
			'payments:crypto:confirm-failed',
			'payments:crypto:order-not-recoverable',
			'payments:crypto:treasury-not-configured',
			'contract_drift',
		];

		for (const code of infraCodes) {
			test(`passes ${code}`, () => {
				const event = createEvent({ errorCode: code });
				const result = filterEvent(event, createHint());
				expect(result).toBe(event);
			});
		}
	});

	describe('network/timeout errors are sampled', () => {
		test('keeps and fingerprints network_error inside the sample rate', () => {
			const event = createEvent({ errorCode: 'network_error' });
			const result = withRandomValue(0.05, () =>
				filterEvent({ ...event, fingerprint: undefined }, createHint()),
			);
			expect(result?.fingerprint).toEqual(['network-transient']);
		});

		test('drops timeout_error outside the sample rate', () => {
			const event = createEvent({ errorCode: 'timeout_error' });
			const result = withRandomValue(0.95, () =>
				filterEvent({ ...event }, createHint()),
			);
			expect(result).toBeNull();
		});
	});

	// Coverage for the "suspected noise" sample bucket — patterns that
	// look environmental but retain a 10% trickle so a real regression
	// still surfaces. See Sentry RAFLI-S (iOS Chrome call-stack
	// overflow) for the canonical case.
	describe('suspected-noise patterns are sampled', () => {
		test('keeps and fingerprints Maximum call stack size exceeded inside the sample rate', () => {
			const event = createEvent();
			const hint = createHint(
				new RangeError('Maximum call stack size exceeded.'),
			);
			const result = withRandomValue(0.05, () => filterEvent(event, hint));
			expect(result?.fingerprint).toEqual([
				'suspected-noise',
				'Maximum call stack size exceeded',
			]);
		});

		test('drops Maximum call stack size exceeded outside the sample rate', () => {
			const event = createEvent();
			const hint = createHint(
				new RangeError('Maximum call stack size exceeded.'),
			);
			const result = withRandomValue(0.95, () => filterEvent(event, hint));
			expect(result).toBeNull();
		});

		test('non-noise errors are never sampled as noise', () => {
			const event = createEvent();
			const hint = createHint(new Error('Unexpected token in JSON'));
			const result = filterEvent(event, hint);
			// Non-noise error should always pass through unmodified — no
			// fingerprint attached by the suspected-noise bucket.
			expect(result).toBe(event);
			expect(result?.fingerprint).toBeUndefined();
		});
	});

	describe('browser noise is dropped', () => {
		const noisyMessages = [
			'ResizeObserver loop completed with undelivered notifications.',
			'ChunkLoadError: loading chunk 42 failed',
			'Loading chunk 7 failed after 3 retries',
			'chrome-extension://abc123/content.js',
			'moz-extension://some-addon/background.js',
			'extension://something',
		];

		for (const message of noisyMessages) {
			test(`drops "${message.slice(0, 40)}..."`, () => {
				const event = createEvent();
				const hint = createHint(new Error(message));
				const result = filterEvent(event, hint);
				expect(result).toBeNull();
			});
		}

		test('drops non-Error string exceptions matching noise', () => {
			const event = createEvent();
			const hint = createHint('ResizeObserver loop limit exceeded');
			const result = filterEvent(event, hint);
			expect(result).toBeNull();
		});

		test('passes non-noisy error messages', () => {
			const event = createEvent();
			const hint = createHint(new Error('Unexpected token in JSON'));
			const result = filterEvent(event, hint);
			expect(result).toBe(event);
		});
	});

	// Regression coverage for Sentry issues RAFLI-6/7/8/9/A. Every test in
	// this block mirrors the exact exception shape Sentry captured in
	// production so a future filter refactor that drops any of these
	// patterns fails loudly here.
	describe('third-party Web3 / extension noise is dropped', () => {
		// RAFLI-6 — MetaMask inpage.js content script throws when the wallet
		// extension isn't installed. The error is re-wrapped as "Failed to
		// connect to MetaMask" via the linked-errors chain.
		test('drops "MetaMask extension not found" (Sentry RAFLI-6 root)', () => {
			const event = createEvent();
			const hint = createHint(new Error('MetaMask extension not found'));
			const result = filterEvent(event, hint);
			expect(result).toBeNull();
		});

		test('drops "Failed to connect to MetaMask" (Sentry RAFLI-6 linked)', () => {
			const event = createEvent();
			const hint = createHint(new Error('Failed to connect to MetaMask'));
			const result = filterEvent(event, hint);
			expect(result).toBeNull();
		});

		// RAFLI-7 / RAFLI-8 — Safari and Firefox private-mode throw a
		// `SecurityError` (DOMException, instanceof Error) when wallet SDKs
		// touch `localStorage` / `window.localStorage` eagerly.
		test('drops Safari private-mode SecurityError from wallet connectors (Sentry RAFLI-7)', () => {
			const event = createEvent();
			// The production event is a DOMException named 'SecurityError' with
			// this exact message. Regular Error faithfully reproduces the
			// matchable surface for filter purposes.
			const hint = createHint(new Error('The operation is insecure.'));
			const result = filterEvent(event, hint);
			expect(result).toBeNull();
		});

		// RAFLI-B / RAFLI-C — Chrome/Android equivalent of the above. Fires in
		// embedded WebViews (Telegram, Instagram in-app browsers) where
		// localStorage is sandboxed. Wagmi's wallet connectors trigger it
		// during session restore.
		test('drops Chrome localStorage SecurityError from @wagmi/connectors (Sentry RAFLI-B)', () => {
			const event = createEvent();
			const hint = createHint(
				new Error(
					"Failed to read the 'localStorage' property from 'Window': Access is denied for this document.",
				),
			);
			const result = filterEvent(event, hint);
			expect(result).toBeNull();
		});

		// RAFLI-9 — MS Office / Outlook browser extension raises this message
		// via a content-script global handler. Sentry captures it as a
		// non-Error scalar promise rejection.
		test('drops MS Office extension noise (Sentry RAFLI-9)', () => {
			const event = createEvent();
			const hint = createHint(
				'Object Not Found Matching Id:2, MethodName:update, ParamCount:4',
			);
			const result = filterEvent(event, hint);
			expect(result).toBeNull();
		});

		// RAFLI-A — wallet RPC errors (EIP-1193) throw plain `{code, message}`
		// objects that escape wagmi's async handlers during pre-hydration
		// wallet probing. Sentry synthesizes this exact title in
		// `event.exception.values[0].value` for non-Error rejections.
		test('drops plain-object wallet RPC rejection via synthesized title (Sentry RAFLI-A)', () => {
			const event = createEvent(
				undefined,
				'Object captured as promise rejection with keys: code, message',
			);
			// `String({code, message})` coerces to "[object Object]" — the filter
			// must fall back to `event.exception.values[0].value` to match.
			const hint = createHint({ code: 4001, message: 'User rejected' });
			const result = filterEvent(event, hint);
			expect(result).toBeNull();
		});

		// RAFLI-5 — wagmi hooks called outside WagmiProvider during
		// provider initialization or extension probing.
		test('drops WagmiProviderNotFoundError (Sentry RAFLI-5)', () => {
			const event = createEvent();
			const hint = createHint(
				new Error('`useConfig` must be used within `WagmiProvider`.'),
			);
			const result = filterEvent(event, hint);
			expect(result).toBeNull();
		});

		// RAFLI-F — Browser fetch API network failure during Next.js server
		// action call. The app catches this and shows a toast, but Next.js
		// internals fire a separate unhandled rejection.
		test('drops "Failed to fetch" TypeError from server action (Sentry RAFLI-F)', () => {
			const event = createEvent();
			const hint = createHint(new TypeError('Failed to fetch'));
			const result = filterEvent(event, hint);
			expect(result).toBeNull();
		});

		// RAFLI-M — Wallet extension `inpage.js` calls
		// chrome.runtime.sendMessage() without an extensionId and Chrome
		// throws this exact TypeError into the page scope. Environmental
		// noise, no fix possible from our code.
		test('drops chrome.runtime.sendMessage extension TypeError (Sentry RAFLI-M)', () => {
			const event = createEvent();
			const hint = createHint(
				new TypeError(
					'Error in invocation of runtime.sendMessage(optional string extensionId, any message, optional object options, optional function callback): chrome.runtime.sendMessage() called from a webpage must specify an Extension ID (string) for its first argument.',
				),
			);
			const result = filterEvent(event, hint);
			expect(result).toBeNull();
		});

		// RAFLI-N — Wallet extension content script (inpage.js) calls
		// `.removeListener()` on an undefined provider during navigation
		// teardown. The exception *message* in production is the bare
		// "Cannot read properties of undefined (reading 'removeListener')"
		// — identical to a genuine app bug. The only signal that this is
		// extension-origin is the stack frame filename `app:///inpage.js`,
		// so the filter must inspect `exception.values[].stacktrace.frames[]`,
		// not just the message. This test reproduces the exact production
		// event shape captured in Sentry and guards against regressions
		// that drop the stack-frame check.
		test('drops removeListener noise from inpage.js (Sentry RAFLI-N)', () => {
			const event = createEvent(undefined, undefined, [
				{
					filename: 'app:///inpage.js',
					abs_path: 'app:///inpage.js',
					function: 'n',
				},
				{
					filename: 'app:///inpage.js',
					abs_path: 'app:///inpage.js',
					function: 'Object.stopListeners',
				},
				{
					filename: '<anonymous>',
					abs_path: '<anonymous>',
					function: 'Array.forEach',
				},
				{
					filename: 'app:///inpage.js',
					abs_path: 'app:///inpage.js',
				},
			]);
			const hint = createHint(
				new TypeError(
					"Cannot read properties of undefined (reading 'removeListener')",
				),
			);
			const result = filterEvent(event, hint);
			expect(result).toBeNull();
		});

		// RAFLI-Q — Safari iOS fires "Load failed" TypeError as an unhandled
		// rejection when a fetch is aborted before headers arrive. Happens
		// on user navigation away, tab backgrounding, or flaky cellular
		// networks. Not actionable — Safari surfaces no richer reason.
		test('drops Safari iOS "Load failed" fetch abort (Sentry RAFLI-Q)', () => {
			const event = createEvent();
			const hint = createHint(new TypeError('Load failed'));
			const result = filterEvent(event, hint);
			expect(result).toBeNull();
		});

		// RAFLI-R — Reown AppKit / WalletConnect probes Telegram's postEvent
		// bridge to detect Mini App context. Outside Telegram the bridge
		// responds "Method not found" which surfaces as an unhandled
		// rejection. We don't ship Telegram integration — environmental.
		test('drops Telegram postEvent "Method not found" (Sentry RAFLI-R)', () => {
			const event = createEvent();
			const hint = createHint(
				new Error('Error invoking postEvent: Method not found'),
			);
			const result = filterEvent(event, hint);
			expect(result).toBeNull();
		});

		// RAFLI-T — `@walletconnect/ethereum-provider` throws this when the
		// user closes the wallet-selection modal without selecting an account
		// or when a provider returns an empty accounts array. User-
		// cancellation path, not a defect in our code.
		test('drops WalletConnect "empty accounts for namespace" (Sentry RAFLI-T)', () => {
			const event = createEvent();
			const hint = createHint(
				new Error('Unsupported or empty accounts for namespace'),
			);
			const result = filterEvent(event, hint);
			expect(result).toBeNull();
		});

		// RAFLI-18 — TronLink wallet extension writes to a Proxy-wrapped
		// global (`window.tronLink.tronlinkParams`) whose `set` trap returns
		// `false`, throwing a TypeError into page scope during TronLink's
		// window probing. Anchored on the `tronlinkParams` property name
		// (TronLink-exclusive identifier) instead of the extension's
		// content-script path `injected/injected.js`, which is also shipped
		// by unrelated extensions (Better Pronote, SAP Build Process
		// Automation) — a path-only filter would risk dropping real app
		// errors whose stacks interleave with those extensions.
		test('drops TronLink tronlinkParams proxy TypeError (Sentry RAFLI-18)', () => {
			const event = createEvent();
			const hint = createHint(
				new TypeError(
					"'set' on proxy: trap returned falsish for property 'tronlinkParams'",
				),
			);
			expect(filterEvent(event, hint)).toBeNull();
		});

		// Negative case — a genuine app error with a `{code, message}`-shaped
		// title from our own ServiceResponse must NOT be swept up. The
		// pattern is narrowly anchored to Sentry's synthesized title, so a
		// regular Error with different wording passes through.
		test('passes real Error with unrelated code/message wording', () => {
			const event = createEvent();
			const hint = createHint(
				new Error('Backend returned { code: 500, message: "fail" }'),
			);
			const result = filterEvent(event, hint);
			expect(result).toBe(event);
		});
	});

	// Stack-frame noise bucket — errors whose message is indistinguishable
	// from a real app bug but whose stack originates entirely in third-party
	// code we don't ship. See `NOISY_STACK_FRAME_PATTERNS` in filter.ts.
	describe('third-party stack-frame noise is dropped (RAFLI-N class)', () => {
		test('drops event whose frames resolve to app:///inpage.js', () => {
			// Generic message — matches neither BROWSER_NOISE_PATTERNS nor
			// SUSPECTED_NOISE_PATTERNS. Only the frame filename tells us it
			// is extension-origin.
			const event = createEvent(undefined, 'some generic error', [
				{ filename: 'app:///inpage.js', abs_path: 'app:///inpage.js' },
			]);
			const hint = createHint(new Error('some generic error'));
			expect(filterEvent(event, hint)).toBeNull();
		});

		test('drops frames that only populate abs_path (chrome-extension://)', () => {
			// Browser-extension content scripts typically omit `filename`
			// post-symbolication — only the `abs_path` retains the
			// `chrome-extension://` URL. The filter must check both.
			const event = createEvent(undefined, 'generic TypeError', [
				{
					abs_path: 'chrome-extension://abcdef123/content.js',
					function: 'handle',
				},
			]);
			const hint = createHint(new TypeError('generic TypeError'));
			expect(filterEvent(event, hint)).toBeNull();
		});

		test('drops moz-extension:// origin', () => {
			const event = createEvent(undefined, 'x is not defined', [
				{ abs_path: 'moz-extension://uuid/background.js' },
			]);
			const hint = createHint(new ReferenceError('x is not defined'));
			expect(filterEvent(event, hint)).toBeNull();
		});

		test('drops safari-web-extension:// origin', () => {
			const event = createEvent(undefined, 'Load failed 2', [
				{ abs_path: 'safari-web-extension://uuid/inject.js' },
			]);
			const hint = createHint(new Error('Load failed 2'));
			expect(filterEvent(event, hint)).toBeNull();
		});

		test('drops when only one frame deep in the stack is noisy', () => {
			// Real RAFLI-N events interleave `<anonymous>` frames with
			// `inpage.js` frames — the filter must scan every frame, not
			// just the top.
			const event = createEvent(undefined, 'generic', [
				{ filename: '<anonymous>', function: 'Array.forEach' },
				{ filename: '<anonymous>', function: 'Promise.then' },
				{ filename: 'app:///inpage.js', function: 'teardown' },
			]);
			const hint = createHint(new Error('generic'));
			expect(filterEvent(event, hint)).toBeNull();
		});

		test('passes event with only app frames and no noise', () => {
			// Negative case — a genuine app-origin error must not be
			// accidentally swept up by the stack-frame filter.
			const event = createEvent(undefined, 'app bug', [
				{
					filename: 'app:///_next/static/chunks/app-page.js',
					function: 'handleSubmit',
				},
				{
					filename: 'app:///_next/static/chunks/main.js',
					function: 'Form.onSubmit',
				},
			]);
			const hint = createHint(new Error('app bug'));
			expect(filterEvent(event, hint)).toBe(event);
		});

		// `injected/injected.js` is NOT TronLink-exclusive — two unrelated
		// Chrome extensions declare the same web-accessible resource path
		// in their manifests (Better Pronote, SAP Build Process Automation).
		// If a user of one of those extensions hits a GENUINE app bug whose
		// stack happens to interleave with their content script, a path-only
		// filter would drop it. The correct attribution for TronLink noise
		// is the `tronlinkParams` message match (TronLink-exclusive global),
		// not the shared path. This test guards the negative case.
		test('passes real app error with injected/injected.js frame but no tronlinkParams (non-TronLink extension collision)', () => {
			const event = createEvent(
				undefined,
				'Cannot read property of undefined',
				[
					{
						filename: 'app:///_next/static/chunks/app-page.js',
						function: 'handleSubmit',
					},
					{
						filename: 'app:///injected/injected.js',
						abs_path: 'app:///injected/injected.js',
					},
				],
			);
			const hint = createHint(
				new TypeError('Cannot read property of undefined'),
			);
			expect(filterEvent(event, hint)).toBe(event);
		});

		test('passes event with no exception.values', () => {
			// Message-only events (e.g. `Sentry.captureMessage`) have no
			// stack — the filter must treat the missing frames array as
			// "no match" and pass the event through.
			const event = createEvent();
			const hint = createHint(new Error('app bug'));
			expect(filterEvent(event, hint)).toBe(event);
		});
	});

	describe('null/undefined originalException handling', () => {
		test('passes when originalException is null', () => {
			const event = createEvent();
			const result = filterEvent(event, createHint(null));
			expect(result).toBe(event);
		});

		test('passes when originalException is undefined', () => {
			const event = createEvent();
			const result = filterEvent(event, createHint(undefined));
			expect(result).toBe(event);
		});
	});
});
