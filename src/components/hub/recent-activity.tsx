import { Button } from '@/components/ui/button';
import { cn } from '@/lib/class-names';

import {
	ACTIVITY_EMPTY,
	ACTIVITY_ENTRIES,
	ACTIVITY_HEADER,
	type ActivityEntry,
	type ActivityState,
	GUEST_COPY,
} from './hub-content';

/** Empty-state copy for the non-populated feed variants. */
const EMPTY_COPY: Record<
	'empty' | 'guest',
	{ title: string; subtitle: string; cta: string }
> = {
	empty: {
		title: ACTIVITY_EMPTY.title,
		subtitle: ACTIVITY_EMPTY.subtitle,
		cta: ACTIVITY_EMPTY.cta,
	},
	guest: {
		title: GUEST_COPY.activityTitle,
		subtitle: GUEST_COPY.activitySubtitle,
		cta: GUEST_COPY.subscribe,
	},
};

/**
 * Formats a signed credit delta into its "+N" / "−N" label.
 *
 * @param delta - Signed credit change
 * @returns Display string with an explicit sign
 */
function formatDelta(delta: number): string {
	return delta >= 0 ? `+${delta}` : `−${Math.abs(delta)}`;
}

/**
 * One feed row — avatar dot, title + timestamp, and a coloured credit delta.
 *
 * @param entry - Activity entry
 * @returns A single row
 */
function ActivityRow({ entry }: { readonly entry: ActivityEntry }) {
	const positive = entry.delta >= 0;
	return (
		<li className="flex items-center gap-3 py-3">
			<span className="bg-brand-sky/60 size-9 shrink-0 rounded-full" />
			<div className="min-w-0 flex-1">
				<p className="text-ink-900 text-body-sm truncate font-medium">
					{entry.title}
				</p>
				<p className="text-ink-400 text-xs">{entry.time}</p>
			</div>
			<span
				className={cn(
					'shrink-0 text-sm font-semibold',
					positive ? 'text-status-live' : 'text-destructive',
				)}
			>
				{formatDelta(entry.delta)} credits
			</span>
		</li>
	);
}

interface RecentActivityProps {
	/** Feed state — defaults to the live hub's populated feed. */
	readonly state?: ActivityState;
}

/**
 * Recent-activity feed — a header above the last five moves, each with a
 * coloured credit delta. The empty state swaps the list for a first-game CTA.
 *
 * @param state - Feed state to render
 * @returns The activity card
 */
export function RecentActivity({ state = 'populated' }: RecentActivityProps) {
	const empty = state === 'guest' ? EMPTY_COPY.guest : EMPTY_COPY.empty;

	return (
		<section className="flex flex-col rounded-2xl border border-black/10 bg-white p-5 sm:p-6">
			<div className="flex flex-col gap-1">
				<h2 className="font-clash-display text-ink-900 text-xl font-semibold">
					{ACTIVITY_HEADER.title}
				</h2>
				<p className="text-ink-500 text-body-sm">{ACTIVITY_HEADER.subtitle}</p>
			</div>

			{state === 'populated' ? (
				<ul className="mt-2 divide-y divide-black/5">
					{ACTIVITY_ENTRIES.map(entry => (
						<ActivityRow key={entry.title} entry={entry} />
					))}
				</ul>
			) : (
				<div className="mt-6 flex flex-col items-center gap-3 py-8 text-center">
					<span className="flex size-12 items-center justify-center rounded-full bg-black/5 text-2xl">
						🎲
					</span>
					<p className="text-ink-900 text-body-md font-semibold">
						{empty.title}
					</p>
					<p className="text-ink-500 text-body-sm max-w-xs">{empty.subtitle}</p>
					<Button size="sm" className="mt-1">
						{empty.cta}
					</Button>
				</div>
			)}
		</section>
	);
}
