import { Check, Gift, Lock, Play, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/class-names';

import {
	type DayState,
	GUEST_COPY,
	STREAK_DAYS,
	STREAK_HEADER,
	type StreakDay,
	type StreakState,
} from './hub-content';

/** Per-tile visual treatment keyed by day sub-state. */
const DAY_STYLE: Record<DayState, string> = {
	done: 'bg-brand-mint/60 border-status-live/40',
	today: 'bg-brand-yellow border-ink-900',
	locked: 'bg-black/5 border-black/10 text-ink-400',
	bonus: 'bg-brand-sky/60 border-status-scheduled/40',
	missed: 'bg-destructive/10 border-destructive/40 text-destructive',
};

/**
 * Renders the centre of a day tile. Every state shows a small status glyph
 * except "today", which surfaces a Play button that jumps down to the games
 * section (the `#games` anchor on the hub page).
 *
 * @param state - Day sub-state
 * @returns The matching icon, or the Play CTA for the current day
 */
function DayIcon({ state }: { readonly state: DayState }) {
	switch (state) {
		case 'done':
			return <Check className="text-status-live size-5" />;
		case 'locked':
			return <Lock className="text-ink-400 size-4" />;
		case 'bonus':
			return <Gift className="text-status-scheduled size-5" />;
		case 'missed':
			return <X className="text-destructive size-5" />;
		case 'today':
			// Today is the playable day — scroll up to the games grid on click.
			return (
				<Button asChild size="sm" className="h-7 gap-1 px-2.5 text-xs">
					<a href="#games">
						<Play className="size-3" />
						Play
					</a>
				</Button>
			);
	}
}

/**
 * A single day tile: weekday label, centre icon (or Play button on "today"),
 * and a status caption.
 *
 * @param day - Day content + sub-state
 * @returns One streak tile
 */
function StreakDayTile({ day }: { readonly day: StreakDay }) {
	return (
		<li
			className={cn(
				'flex aspect-square flex-1 flex-col items-center justify-center gap-1.5 rounded-xl border-2 p-1',
				DAY_STYLE[day.state],
			)}
		>
			<span className="text-ink-700 text-xs font-semibold tracking-wide">
				{day.label}
			</span>
			<DayIcon state={day.state} />
			<span
				className={cn(
					'hidden text-xs font-medium sm:block',
					day.state === 'today' ? 'text-ink-900 font-semibold' : 'text-ink-500',
				)}
			>
				{day.caption}
			</span>
		</li>
	);
}

/** Per-macro-state header + day layout presets covering the gallery. */
const STREAK_PRESETS: Record<
	StreakState,
	{ badge: string; title: string; days: readonly StreakDay[] }
> = {
	fresh: {
		badge: 'Day 0 of 7',
		title: 'Fresh week. Day one is on you.',
		days: [
			{ label: 'MON', state: 'today', caption: 'TODAY' },
			{ label: 'TUE', state: 'locked', caption: 'Locked' },
			{ label: 'WED', state: 'locked', caption: 'Locked' },
			{ label: 'THU', state: 'locked', caption: 'Locked' },
			{ label: 'FRI', state: 'locked', caption: 'Locked' },
			{ label: 'SAT', state: 'locked', caption: 'Locked' },
			{ label: 'SUN', state: 'bonus', caption: '+5 BONUS' },
		],
	},
	'mid-run': {
		badge: STREAK_HEADER.badge,
		title: STREAK_HEADER.title,
		days: STREAK_DAYS,
	},
	complete: {
		badge: '✓ COMPLETED',
		title: 'Seven for seven. +5 credits added.',
		days: [
			{ label: 'MON', state: 'done', caption: 'Done' },
			{ label: 'TUE', state: 'done', caption: 'Done' },
			{ label: 'WED', state: 'done', caption: 'Done' },
			{ label: 'THU', state: 'done', caption: 'Done' },
			{ label: 'FRI', state: 'done', caption: 'Done' },
			{ label: 'SAT', state: 'done', caption: 'Done' },
			{ label: 'SUN', state: 'bonus', caption: '+5 EARNED' },
		],
	},
	broken: {
		badge: '✕ RESET',
		title: 'Missed Wednesday. The chain starts over.',
		days: [
			{ label: 'MON', state: 'done', caption: 'Done' },
			{ label: 'TUE', state: 'done', caption: 'Done' },
			{ label: 'WED', state: 'missed', caption: 'Missed' },
			{ label: 'THU', state: 'today', caption: 'TODAY' },
			{ label: 'FRI', state: 'locked', caption: 'Locked' },
			{ label: 'SAT', state: 'locked', caption: 'Locked' },
			{ label: 'SUN', state: 'bonus', caption: '+5 BONUS' },
		],
	},
	guest: {
		badge: GUEST_COPY.streakBadge,
		title: GUEST_COPY.streakTitle,
		days: [
			{ label: 'MON', state: 'locked', caption: 'Locked' },
			{ label: 'TUE', state: 'locked', caption: 'Locked' },
			{ label: 'WED', state: 'locked', caption: 'Locked' },
			{ label: 'THU', state: 'locked', caption: 'Locked' },
			{ label: 'FRI', state: 'locked', caption: 'Locked' },
			{ label: 'SAT', state: 'locked', caption: 'Locked' },
			{ label: 'SUN', state: 'locked', caption: '+5 Sun' },
		],
	},
};

interface WeeklyStreakProps {
	/** Macro state — defaults to the live hub's mid-run. */
	readonly state?: StreakState;
}

/**
 * Weekly streak tracker — a header (kicker, headline, explainer, day badge)
 * above a 7-tile day strip. The `state` prop selects one of the four Figma
 * gallery presets; tiles carry their own done/today/locked/bonus/missed look.
 *
 * @param state - Streak macro state to render
 * @returns The streak card
 */
export function WeeklyStreak({ state = 'mid-run' }: WeeklyStreakProps) {
	const preset = STREAK_PRESETS[state];
	const isGuest = state === 'guest';

	return (
		<section className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="flex flex-col gap-1">
					<p className="text-ink-500 text-label-sm font-semibold tracking-wider uppercase">
						{STREAK_HEADER.eyebrow}
					</p>
					<h2 className="font-clash-display text-ink-900 text-2xl font-semibold sm:text-3xl lg:text-4xl">
						{preset.title}
					</h2>
					<p className="text-ink-500 text-body-sm">
						{isGuest ? GUEST_COPY.streakSubtitle : STREAK_HEADER.explainer}
					</p>
				</div>
				{isGuest ? (
					<Button size="sm">{GUEST_COPY.subscribe}</Button>
				) : (
					<span className="bg-brand-yellow text-ink-900 shrink-0 rounded-full border border-black/10 px-3 py-1 text-sm font-semibold">
						{preset.badge}
					</span>
				)}
			</div>

			<ul className="mt-5 flex gap-2 sm:gap-3">
				{preset.days.map(day => (
					<StreakDayTile key={day.label} day={day} />
				))}
			</ul>
		</section>
	);
}
