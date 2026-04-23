'use client';

// Client boundary: timer ticks via Date.now() in a setInterval. A server
// render would either bake a stale value into HTML or stream it back
// every frame — both worse than hydrating once and letting the browser
// run its own clock.

import Link from 'next/link';
import { useEffect, useState, useSyncExternalStore } from 'react';

import { Button } from '@/components/ui/button';

import { formatCountdown, type CountdownParts } from './format-countdown';
import { INITIAL_PARTS } from './launch-countdown-initial-parts';

/** Distance between ticks. 1s matches the SS field resolution in the UI. */
const TICK_INTERVAL_MS = 1_000;

// Module-scope snapshot callbacks for `useSyncExternalStore`. React compares
// these by reference — inline arrow functions would tear down the subscription
// on every render and defeat the "mount flag" pattern. The subscribe fn is a
// no-op because we never need to notify React of an external change; the
// client/server snapshot mismatch alone is what drives the one-time transition.
function subscribeNoop(): () => void {
	return function unsubscribe() {};
}
function getHasMountedClient(): boolean {
	return true;
}
function getHasMountedServer(): boolean {
	return false;
}

interface LaunchCountdownProps {
	/** ISO datetime of the launch-pricing deadline — parsed via Date.parse. */
	endsAt: string;
	/** Anchor the primary CTA scrolls to (defaults to the plan cards). */
	ctaHref?: string;
	/** Secondary link target for the "want to start smaller?" escape hatch. */
	secondaryHref?: string;
}

/**
 * Derives the display parts from the deadline and a tick reference.
 *
 * Extracted so the initial render (server + first hydration) uses the same
 * code path as the setInterval tick. Keeping it pure means we can pre-compute
 * once at mount without touching state, avoiding a flash of "00:00:00".
 */
function compute(endsAtMs: number, nowMs: number): CountdownParts {
	return formatCountdown(endsAtMs - nowMs);
}

/**
 * Countdown banner for the launch-pricing promo.
 *
 * Renders the `HH:MM:SS` ticker plus a primary CTA that jumps back to the
 * plan cards — per the spec, the CTA exists so a user who scrolled past
 * the cards still has a one-click path back to picking a plan before the
 * deadline elapses.
 *
 * Hides itself once the deadline passes so stale banners never haunt the
 * page. The parent page should also avoid rendering this component at all
 * when the env var is unset — this is a second-line defence.
 *
 * @param endsAt - ISO datetime string, typically from `env.LAUNCH_PRICING_ENDS_AT`.
 * @param ctaHref - Defaults to `#plans` so the primary CTA scrolls to the cards.
 * @param secondaryHref - Escape hatch ("Want to start smaller?") — defaults to /browse.
 */
export function LaunchCountdown({
	endsAt,
	ctaHref = '#plans',
	secondaryHref = '/browse',
}: LaunchCountdownProps) {
	// Parse once outside the effect — `Date.parse` returns NaN for malformed
	// strings, which `formatCountdown` already handles via its finite-check.
	const endsAtMs = Date.parse(endsAt);

	// `useSyncExternalStore` is the idiomatic React 18 "am I hydrated?" primitive:
	// SSR + the first client render both read the server snapshot (`false`), so
	// hydration matches byte-for-byte. React then flips to the client snapshot
	// (`true`) in a follow-up commit — no setState-in-effect, no hydration warning,
	// no `Date.now()` read during render (which the react-hooks purity rule forbids).
	const hasMounted = useSyncExternalStore(
		subscribeNoop,
		getHasMountedClient,
		getHasMountedServer,
	);

	// Seeded with the stable placeholder so SSR HTML matches first hydrate. The
	// effect below commits the live value as soon as we know we're on the client.
	const [parts, setParts] = useState<CountdownParts>(INITIAL_PARTS);

	useEffect(() => {
		// Wait for the post-mount commit before doing anything. SSR never runs
		// this effect; on the first hydration commit `hasMounted` is still false
		// for one tick. Including it in deps is what arms the ticker.
		if (!hasMounted) return;

		// Deferred to avoid a synchronous setState in the effect body (the
		// react-hooks `set-state-in-effect` rule flags sync setState inside
		// effects as a cascading-render smell). `queueMicrotask` runs after
		// React's current commit but before paint, so the placeholder flashes
		// for at most a microtask — imperceptible in practice. Matches the
		// pattern already used in `crypto-buy-button` for the same lint rule.
		let cancelled = false;
		queueMicrotask(() => {
			if (cancelled) return;
			setParts(compute(endsAtMs, Date.now()));
		});

		// mount: start the 1s ticker. Callbacks inside `setInterval` are
		// async w.r.t. the effect body, so setting state here doesn't trip
		// the cascading-render rule. The ticker self-terminates the first
		// time it produces an `expired: true` snapshot so we don't keep
		// re-rendering after the banner disappears via the `return null`
		// branch below.
		const id = setInterval(() => {
			const next = compute(endsAtMs, Date.now());
			setParts(next);
			if (next.expired) clearInterval(id);
		}, TICK_INTERVAL_MS);

		return () => {
			cancelled = true;
			clearInterval(id);
		};
	}, [endsAtMs, hasMounted]);

	// Business rule: once the deadline elapses, the banner goes away entirely
	// rather than showing "00:00:00 — ended". Stale promos erode trust more
	// than a missing banner does. Parent handles the missing-env case upstream.
	if (parts.expired) return null;

	return (
		<section
			aria-label="Launch pricing countdown"
			className="bg-brand-yellow w-full rounded-3xl px-6 py-10 sm:px-10 sm:py-12"
		>
			<div className="flex flex-col items-center gap-4 text-center">
				<time
					// `dateTime` exposes the machine-readable deadline once; the visible
					// HH:MM:SS ticks every second. We deliberately omit `aria-live` —
					// a polite announcement every second would flood AT users with
					// redundant digits, and the static `dateTime` attribute already
					// conveys urgency semantically. Timer and headline share the same
					// `text-headline-md` treatment so the countdown reads as a single emphatic
					// block rather than a digit + caption pair.
					dateTime={endsAt}
					className="font-clash-display text-headline-md font-semibold tabular-nums"
				>
					{parts.hours}:{parts.minutes}:{parts.seconds}
				</time>
				<h2 className="font-clash-display text-headline-md font-semibold">
					Launch pricing ends soon!
				</h2>
				<p className="text-foreground text-base/dense max-w-213.5 font-normal text-pretty">
					Right now Rafli is new. Draws are running with small participant
					pools. Early subscribers enter with cheaper tickets and free pool
					entries before anyone else.
				</p>
				{/* `asChild` delegates rendering to the anchor while keeping the
				    shadcn focus-visible ring + disabled semantics. Anchor inside
				    button is invalid HTML — Slot rewrites it to a single <a>. */}
				<Button asChild size="lg" className="mt-2 h-12 px-8 font-semibold">
					<Link href={ctaHref}>Choose your subscription and claim now</Link>
				</Button>
				<Link
					href={secondaryHref}
					className="focus-visible:ring-ring/50 rounded-sm text-sm font-medium underline underline-offset-4 hover:no-underline focus-visible:ring-3 focus-visible:outline-none"
				>
					Want to start smaller?
				</Link>
			</div>
		</section>
	);
}
