'use client';

// Client boundary: timer ticks via Date.now() in a setInterval. A server
// render would either bake a stale value into HTML or stream it back
// every frame — both worse than hydrating once and letting the browser
// run its own clock.

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useHasMounted } from '@/lib/hooks/use-has-mounted';

import { computeNextBoundary } from './compute-next-boundary';
import { formatCountdown, type CountdownParts } from './format-countdown';

/** Distance between ticks. 1s matches the SS field resolution in the UI. */
const TICK_INTERVAL_MS = 1_000;

/**
 * Hydration-safe placeholder for the `useState` seed.
 *
 * Width-2 `--` strings keep the `HH:MM:SS` column from collapsing on the
 * first real tick (no one-frame layout jump). `expired: false` is the
 * only legal value here — the rolling banner doesn't hide on expiry, but
 * the field is required by `CountdownParts` so we set the falsy default.
 */
const INITIAL_PARTS: CountdownParts = {
	hours: '--',
	minutes: '--',
	seconds: '--',
	expired: false,
};

interface LaunchCountdownProps {
	/**
	 * Length of the rolling countdown window in ms. The timer counts down from
	 * this value to zero, then advances another `windowMs` and keeps ticking —
	 * the banner never disappears. Boundaries are anchored to the unix epoch
	 * so two clients side-by-side see the same deadline.
	 */
	windowMs: number;
	/** Anchor the primary CTA scrolls to (defaults to the plan cards). */
	ctaHref?: string;
	/** Secondary link target for the "want to start smaller?" escape hatch. */
	secondaryHref?: string;
}

/**
 * Rolling countdown banner for the launch-pricing promo.
 *
 * Renders the `HH:MM:SS` ticker plus a primary CTA that jumps back to the
 * plan cards. The deadline rolls forward by `windowMs` every time the timer
 * hits zero, so the banner is perpetual — no fixed end date, no "ended"
 * state, no stale-promo failure mode. The intentional design compromise is
 * that "ends in 47:59:59" is no longer a literal claim; the user-facing copy
 * keeps the urgency framing because the offer is genuinely time-limited per
 * window.
 *
 * @param windowMs - Length of the rolling window (typically 2 days).
 * @param ctaHref - Defaults to `#plans` so the primary CTA scrolls to the cards.
 * @param secondaryHref - Escape hatch ("Want to start smaller?") — defaults to /browse.
 * @returns Yellow countdown banner with HH:MM:SS ticker and CTA.
 */
export function LaunchCountdown({
	windowMs,
	ctaHref = '#plans',
	secondaryHref = '/browse',
}: LaunchCountdownProps) {
	// Gated on hydration via the shared `useHasMounted` hook — keeps SSR
	// HTML identical across both renders, then arms the ticker in a
	// follow-up commit. The deadline depends on `Date.now()`, which we
	// can't trust on the server (the SSR HTML would freeze whatever value
	// the server saw at render time).
	const hasMounted = useHasMounted();

	// `null` until the first post-mount tick — exposes the live deadline to
	// the `<time dateTime>` attribute so AT users see a real ISO instead of
	// the placeholder while the ticker is initialising.
	const [endsAtMs, setEndsAtMs] = useState<number | null>(null);

	// Seeded with the stable placeholder so SSR HTML matches first hydrate. The
	// effect below commits the live value as soon as we know we're on the client.
	const [parts, setParts] = useState<CountdownParts>(INITIAL_PARTS);

	useEffect(() => {
		// Wait for the post-mount commit before doing anything. SSR never runs
		// this effect; on the first hydration commit `hasMounted` is still false
		// for one tick. Including it in deps is what arms the ticker.
		if (!hasMounted) return;

		// Step 1: anchor the first deadline to the next epoch-modulo boundary.
		// Held in a closure variable (not state) because the interval callback
		// rotates it forward without needing a re-render to "see" the new value
		// — state would lag by one tick due to React's batching.
		let currentEndsAt = computeNextBoundary(Date.now(), windowMs);

		// Step 2: commit the deadline + first paint inside a microtask. The
		// react-hooks `set-state-in-effect` rule flags any synchronous setState
		// inside an effect body as a cascading-render smell, so both the
		// `endsAtMs` commit and the parts commit are deferred together. The
		// microtask runs after React's current commit but before paint, so the
		// placeholder flashes for at most a microtask — imperceptible in
		// practice. Matches the pattern in `crypto-buy-button`.
		let cancelled = false;
		queueMicrotask(() => {
			if (cancelled) return;
			setEndsAtMs(currentEndsAt);
			setParts(formatCountdown(currentEndsAt - Date.now()));
		});

		// Step 3: 1Hz ticker. Callbacks inside `setInterval` are async w.r.t.
		// the effect body, so setting state here doesn't trip the cascading-
		// render rule. On every expired snapshot the deadline rolls forward by
		// another `windowMs` and we recompute the parts immediately so the user
		// never sees a frame of "00:00:00" — they see the new HH:MM:SS instead.
		const id = setInterval(() => {
			let next = formatCountdown(currentEndsAt - Date.now());
			if (next.expired) {
				currentEndsAt = computeNextBoundary(Date.now(), windowMs);
				setEndsAtMs(currentEndsAt);
				next = formatCountdown(currentEndsAt - Date.now());
			}
			setParts(next);
		}, TICK_INTERVAL_MS);

		return () => {
			cancelled = true;
			clearInterval(id);
		};
	}, [hasMounted, windowMs]);

	// Pre-compute the ISO string for the `dateTime` attribute so the JSX
	// stays a pure render. `null` (pre-mount placeholder) collapses to
	// `undefined`, which omits the attribute entirely — preferable to
	// emitting an empty `dateTime=""` that would confuse parsers.
	const dateTimeAttr =
		endsAtMs !== null ? new Date(endsAtMs).toISOString() : undefined;

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
					// `text-headline-lg` treatment (36px) on desktop so the countdown
					// reads as a single emphatic block rather than a digit + caption
					// pair. Mobile steps down to 24px (`text-headline-md`) to keep the
					// banner compact on a single column.
					dateTime={dateTimeAttr}
					className="font-clash-display text-headline-md sm:text-headline-lg font-semibold tabular-nums"
				>
					{parts.hours}:{parts.minutes}:{parts.seconds}
				</time>
				<h2 className="font-clash-display text-headline-md sm:text-headline-lg font-semibold">
					Launch pricing ends soon!
				</h2>
				<p className="text-foreground text-base/dense max-w-(--container-launch-copy) font-normal text-pretty">
					Right now Rafli is new. Sweepstakes are running with small participant
					pools. New subscribers get early access to cheaper entries and free
					sweepstakes access before anyone else.
				</p>
				{/* `asChild` delegates rendering to the anchor while keeping the
				    shadcn focus-visible ring + disabled semantics. Anchor inside
				    button is invalid HTML — Slot rewrites it to a single <a>. */}
				<Button
					asChild
					size="lg"
					className="mt-2 h-12 w-full px-6 font-semibold sm:w-auto sm:px-8"
				>
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
