'use client';

import Script from 'next/script';
import {
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
	type Ref,
} from 'react';

import { clientEnv } from '@/env/client';
import { cn } from '@/lib/class-names';

/**
 * Turnstile JS API loaded explicitly so we control the lifecycle per-form
 * (multiple forms reuse the same script tag — next/script dedupes the load).
 */
const TURNSTILE_SCRIPT_SRC =
	'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

// Cloudflare's recommended retry interval between automatic retries — matches
// the docs default. Surfaced as a constant so the value lives next to the
// other widget-config decisions instead of buried in the render call.
const RETRY_INTERVAL_MS = 8_000;

interface TurnstileRenderOptions {
	sitekey: string;
	callback: (token: string) => void;
	// Cloudflare expects a boolean return: `true` means "we surfaced the
	// error", suppressing the iframe's built-in error overlay so it does not
	// stack on top of our message.
	'error-callback': (errorCode: string) => boolean;
	'expired-callback': () => void;
	// Distinct from `expired-callback` — fires when an interactive challenge
	// timed out before the user solved it. Auto-refresh does not cover this
	// case; the user has to re-engage manually.
	'timeout-callback'?: () => void;
	// Returning `true` opts out of Cloudflare's default unsupported-browser
	// fallback so we render our own copy in the form layout.
	'unsupported-callback'?: () => boolean;
	theme?: 'light' | 'dark' | 'auto';
	// `flexible` adapts the iframe to its container width (min 300px) instead
	// of the fixed 300×65 default — fits inside narrow auth cards on mobile.
	size?: 'normal' | 'compact' | 'flexible';
	appearance?: 'always' | 'execute' | 'interaction-only';
	'refresh-expired'?: 'auto' | 'manual' | 'never';
	retry?: 'auto' | 'never';
	'retry-interval'?: number;
}

interface TurnstileApi {
	render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
	reset: (widgetId: string) => void;
	remove: (widgetId: string) => void;
}

declare global {
	interface Window {
		turnstile?: TurnstileApi;
	}
}

/** Imperative handle parents grab via `ref` to clear a stale token after a failed submit. */
export interface TurnstileWidgetHandle {
	/** Re-issue a fresh challenge. Safe to call before render — no-op if widget not yet mounted. */
	reset: () => void;
}

interface TurnstileWidgetProps {
	/** Fired with the verification token. Parent stores it and forwards it to the auth service. */
	onToken: (token: string) => void;
	/** Fired when the issued token expires (~5 min). Parent should clear stored token + disable submit. */
	onExpire?: () => void;
	/**
	 * Fired when Turnstile reports a render/network error or an unsupported
	 * browser. The widget already shows a user-facing message inline; this
	 * callback exists so parents can clear stored tokens and forward the code
	 * to Sentry for ops visibility.
	 */
	onError?: (errorCode: string) => void;
	ref?: Ref<TurnstileWidgetHandle>;
	className?: string;
}

/**
 * Maps Cloudflare's numeric error codes to user-facing copy. Families per the
 * troubleshooting docs:
 * - 100xxx — client environment issue (refresh recovers)
 * - 110xxx — sitekey / domain misconfiguration (ops issue, contact support)
 * - 300xxx / 600xxx — bot-detection challenge failure
 * https://developers.cloudflare.com/turnstile/troubleshooting/client-side-errors
 *
 * @param errorCode - Raw error code string emitted by Turnstile's `error-callback`
 * @returns User-facing message tailored to the error family
 */
function getTurnstileClientErrorMessage(errorCode: string): string {
	const numeric = Number.parseInt(errorCode, 10);
	if (Number.isNaN(numeric)) {
		return 'Verification failed. Please try again.';
	}
	const family = Math.floor(numeric / 1000);
	switch (family) {
		case 100:
			return 'Please refresh the page and try again.';
		case 110:
			return 'Verification configuration error. Please contact support.';
		case 300:
		case 600:
			return 'Security check failed. Try refreshing or using a different browser.';
		default:
			return 'Verification failed. Please try again.';
	}
}

/**
 * Cloudflare Turnstile widget — issues a single-use token the backend's Better
 * Auth captcha plugin verifies on `/sign-up/email`, `/sign-in/email`,
 * `/sign-in/magic-link`, and `/request-password-reset`.
 *
 * The token is short-lived (~300s) and consumed on submit; parents call
 * `ref.current.reset()` after a failed request to issue a new one. The widget
 * renders its own error banner for client-side failures (network / unsupported
 * browser / bot detection) and forwards the raw error code via `onError` for
 * Sentry capture — backend rejections (e.g. invalid credentials) remain the
 * parent form's responsibility.
 *
 * @returns Inline widget that wires Cloudflare's verification UI into a form
 */
export function TurnstileWidget({
	onToken,
	onExpire,
	onError,
	ref,
	className,
}: TurnstileWidgetProps) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const widgetIdRef = useRef<string | null>(null);
	// Inline error banner state — owned by the widget so every consumer
	// surfaces client-side captcha failures consistently without each form
	// re-implementing its own error-code mapping.
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	// Empty deps are mandatory: omitting them re-attaches the ref every render,
	// and our parents pass a `useState` setter as a callback ref — re-attachment
	// would call `setTurnstile(newObject)` with a fresh identity each commit,
	// schedule a re-render, and loop infinitely. The factory closes over
	// `widgetIdRef` (a stable ref object), so the captured `.current` read
	// always sees the latest widget id even though the factory itself runs once.
	useImperativeHandle(
		ref,
		() => ({
			reset() {
				if (widgetIdRef.current) {
					window.turnstile?.reset(widgetIdRef.current);
					// Clear the stale error banner so the user does not see a
					// contradicting message while Cloudflare draws the fresh challenge.
					setErrorMessage(null);
				}
			},
		}),
		[],
	);

	// mount: third-party widget cleanup — `turnstile.remove` releases DOM nodes
	// and event listeners the script attached when the form unmounts.
	useEffect(() => {
		return () => {
			if (widgetIdRef.current) {
				window.turnstile?.remove(widgetIdRef.current);
				widgetIdRef.current = null;
			}
		};
	}, []);

	// `onReady` fires on first script load AND on every subsequent component
	// mount where the script is already cached, so each form remount renders a
	// fresh widget. Guard against double-render in case React StrictMode or
	// next/script invokes the callback twice.
	function handleScriptReady() {
		if (!containerRef.current || !window.turnstile || widgetIdRef.current) {
			return;
		}
		widgetIdRef.current = window.turnstile.render(containerRef.current, {
			sitekey: clientEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
			callback: token => {
				// Successful issue — wipe any prior error banner so it does not
				// stick around after Cloudflare quietly recovers (e.g. retry).
				setErrorMessage(null);
				onToken(token);
			},
			'error-callback': errorCode => {
				setErrorMessage(getTurnstileClientErrorMessage(errorCode));
				onError?.(errorCode);
				// Tell Turnstile we own the error UI — suppresses its overlay.
				return true;
			},
			'expired-callback': () => onExpire?.(),
			'timeout-callback': () => {
				// Interactive challenge timed out. `refresh-expired: auto` does
				// not cover this case — the user has to re-engage manually.
				setErrorMessage(
					'Verification timed out. Please complete the check above.',
				);
			},
			'unsupported-callback': () => {
				setErrorMessage(
					'Your browser does not support this verification. Please update or try another browser.',
				);
				onError?.('unsupported');
				return true;
			},
			theme: 'auto',
			size: 'flexible',
			// `auto` lets Cloudflare silently re-issue an expired token in-place.
			// `expired-callback` still fires so the parent can re-prime its
			// `captchaToken` state once the new token arrives via `callback`.
			'refresh-expired': 'auto',
			retry: 'auto',
			'retry-interval': RETRY_INTERVAL_MS,
		});
	}

	return (
		<>
			<Script
				src={TURNSTILE_SCRIPT_SRC}
				strategy="afterInteractive"
				onReady={handleScriptReady}
			/>
			<div
				ref={containerRef}
				// `min-h-16` (64px) reserves the iframe's footprint so the form
				// does not jump when Cloudflare hydrates (~150–400ms after the
				// script loads). Pairs with `size: 'flexible'` to fit the auth
				// card's narrow column without overflowing.
				className={cn('min-h-16 w-full', className)}
			/>
			{errorMessage ? (
				<p
					role="status"
					aria-live="polite"
					className="text-destructive mt-2 text-center text-sm"
				>
					{errorMessage}
				</p>
			) : null}
		</>
	);
}
