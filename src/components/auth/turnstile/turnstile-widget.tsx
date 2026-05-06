'use client';

import Script from 'next/script';
import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';

import { clientEnv } from '@/env/client';

/**
 * Turnstile JS API loaded explicitly so we control the lifecycle per-form
 * (multiple forms reuse the same script tag — next/script dedupes the load).
 */
const TURNSTILE_SCRIPT_SRC =
	'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

interface TurnstileRenderOptions {
	sitekey: string;
	callback: (token: string) => void;
	'error-callback': (errorCode: string) => void;
	'expired-callback': () => void;
	theme?: 'light' | 'dark' | 'auto';
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
	/** Fired when Turnstile reports a render/network error. Parent surfaces a user-facing message. */
	onError?: (errorCode: string) => void;
	ref?: Ref<TurnstileWidgetHandle>;
	className?: string;
}

/**
 * Cloudflare Turnstile widget — issues a single-use token the backend's Better
 * Auth captcha plugin verifies on `/sign-up/email`, `/sign-in/email`,
 * `/sign-in/magic-link`, and `/request-password-reset`.
 *
 * The token is short-lived (~300s) and consumed on submit; parents call
 * `ref.current.reset()` after a failed request to issue a new one.
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
			callback: onToken,
			'error-callback': errorCode => onError?.(errorCode),
			'expired-callback': () => onExpire?.(),
			theme: 'auto',
		});
	}

	return (
		<>
			<Script
				src={TURNSTILE_SCRIPT_SRC}
				strategy="afterInteractive"
				onReady={handleScriptReady}
			/>
			<div ref={containerRef} className={className} />
		</>
	);
}
