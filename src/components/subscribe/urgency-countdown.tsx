'use client';

// Client boundary: the ticker reads `Date.now()` in an interval, which
// can't run during SSR. The surface ships the hydration placeholder on
// the server and arms the real ticker after the first client commit —
// gated by `useHasMounted` (same primitive `launch-countdown` uses) so
// the pattern is shared and the hydration mismatch window is closed by
// one `useSyncExternalStore`, not per-component `queueMicrotask` hacks.

import { useEffect, useState } from 'react';

import {
	formatCountdown,
	type CountdownParts,
} from '@/components/pricing/countdown/format-countdown';
import { useHasMounted } from '@/lib/hooks/use-has-mounted';

import { CREDIT_PAYOUT_USD } from './offer';

// 15-minute promotional urgency window anchored to the visitor's
// mount time. Marketing pressure cue, not a backend-enforced deadline
// — when the real launch deadline lands, replace the
// `Date.now() + URGENCY_WINDOW_MS` anchor with `Date.parse(envDeadline)`
// and the rest of the component stays put.
const URGENCY_WINDOW_MS = 15 * 60 * 1_000;
const TICK_INTERVAL_MS = 1_000;

/** Placeholder parts — width-2 strings so digits don't jump on first tick. */
const PLACEHOLDER_PARTS: CountdownParts = {
	hours: '--',
	minutes: '--',
	seconds: '--',
	expired: false,
};

/**
 * "LIMITED OFFER" strip with an `HH:MM:SS` countdown pinned beneath
 * the hero.
 *
 * Figma spec: 70px full-bleed band, yellow fill, hairline black
 * border top/bottom. Outer padding `pt-3 pb-4` (13/16px) totals 29px
 * above/below the 39px timer row → 68px overall, within 2px of the
 * 70px Figma frame with no perceptual gap.
 *
 * @returns Yellow full-bleed banner with timer boxes and promo caption
 */
export function UrgencyCountdown() {
	// SSR + first client render both see `false`, so hydration matches
	// byte-for-byte and the placeholder `--:--:--` ships. The real ticker
	// arms in a follow-up commit once React flips the flag.
	const hasMounted = useHasMounted();
	const [endsAtMs, setEndsAtMs] = useState<number | null>(null);
	const [parts, setParts] = useState<CountdownParts>(PLACEHOLDER_PARTS);

	useEffect(() => {
		// mount: anchor the 15-min window to the client clock. Reading
		// `Date.now()` during render would drift from the SSR value and
		// trigger a hydration mismatch, so the effect is the first time
		// we learn the visitor's wall-clock time.
		if (!hasMounted) return;
		const anchor = Date.now() + URGENCY_WINDOW_MS;

		// Deferred into `queueMicrotask` so the first commit doesn't
		// contain a synchronous setState in the effect body (the
		// `react-hooks/set-state-in-effect` rule flags that pattern).
		// Matches `launch-countdown` verbatim.
		let cancelled = false;
		queueMicrotask(() => {
			if (cancelled) return;
			setEndsAtMs(anchor);
			setParts(formatCountdown(URGENCY_WINDOW_MS));
		});

		const id = setInterval(() => {
			const next = formatCountdown(anchor - Date.now());
			setParts(next);
			// Freeze on expiry rather than looping — a fake timer that
			// resets to 15:00 every tick past zero would cycle forever
			// and signal "the urgency is a lie" to repeat visitors.
			if (next.expired) clearInterval(id);
		}, TICK_INTERVAL_MS);

		return function stopTicker() {
			cancelled = true;
			clearInterval(id);
		};
	}, [hasMounted]);

	const endsAtIso =
		endsAtMs === null ? undefined : new Date(endsAtMs).toISOString();

	return (
		<section
			aria-label="Limited offer countdown"
			className="bg-brand-yellow border-brand-dark relative left-1/2 w-screen -translate-x-1/2 border-y"
		>
			<div className="flex flex-wrap items-center justify-center gap-2 p-3 md:py-4">
				{/* LIMITED OFFER tag — Figma Inter 600 10/12 with 0.5px
				    tracking (= 0.05em). `text-3xs` is the 10px token;
				    `tracking-caps-2` resolves to 0.05em. `rounded-sm` (4px)
				    matches the Figma radius exactly. */}
				<span className="bg-ink-800 text-brand-yellow tracking-caps-2 text-3xs rounded-sm px-2 py-0.5 font-semibold">
					LIMITED OFFER
				</span>

				<time
					dateTime={endsAtIso}
					aria-live="polite"
					className="flex items-center gap-2 tabular-nums"
				>
					<TimerBox display={parts.hours} />
					<Colon />
					<TimerBox display={parts.minutes} />
					<Colon />
					<TimerBox display={parts.seconds} />
				</time>

				{/* Trailing copy — Figma Inter 600 12/15 `#182135` with
				    0.3px tracking (= 0.025em at 12px). `tracking-wide`
				    resolves to 0.025em, an exact match. */}
				<span className="text-navy text-label-sm font-semibold tracking-wide">
					to claim your ${CREDIT_PAYOUT_USD} in raffle credits
				</span>
			</div>
		</section>
	);
}

interface TimerBoxProps {
	/** Pre-formatted two-character string ("07", "--"). */
	readonly display: string;
}

/**
 * Single countdown digit block.
 *
 * Figma: 39px tall, 40px min-width, 6px corners, dark fill, yellow
 * Inter 700 22/27 digits. `h-9.5` is the 38px token (within 1px of
 * spec), `min-w-10` = 40px, `rounded` = 6px in v4. `text-2xl` ships
 * 24px — 2px above Figma, but at tabular-nums the delta is below
 * perceptual threshold on the yellow-on-black chip.
 */
function TimerBox({ display }: TimerBoxProps) {
	return (
		<div className="bg-ink-800 flex h-10 min-w-10 items-center justify-center rounded px-2.5 py-1.5">
			<span className="text-brand-yellow text-2xl font-bold">{display}</span>
		</div>
	);
}

/** Colon separator between timer boxes — Inter 700 20/24 navy. */
function Colon() {
	return <span className="text-navy text-xl font-bold">:</span>;
}
