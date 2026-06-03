import { Coins, Lock } from 'lucide-react';

import { cn } from '@/lib/class-names';

import { type CreditsState, HUB_CREDITS } from './hub-content';

interface CreditsDisplay {
	readonly count: number;
	readonly title: string;
	readonly worth: string;
	readonly explainer: string;
	readonly locked?: boolean;
}

/** Full presets covering the four Figma credits-card states. */
const CREDITS_PRESETS: Record<CreditsState, CreditsDisplay> = {
	loaded: {
		count: HUB_CREDITS.count,
		title: HUB_CREDITS.title,
		worth: HUB_CREDITS.worth,
		explainer: HUB_CREDITS.explainer,
	},
	low: {
		count: 2,
		title: '2 credits left',
		worth: 'Worth up to $4 off',
		explainer: 'Running low — they refill at the start of next cycle.',
	},
	empty: {
		count: 0,
		title: '0 credits',
		worth: 'Refills Jun 12 · 15 days to go',
		explainer: 'Out for now. Free games still earn credits back.',
	},
	locked: {
		count: 0,
		title: 'Credits locked',
		worth: 'Subscribe to get 12 monthly',
		explainer: 'Credits are a member perk. Start a plan to unlock them.',
		locked: true,
	},
};

interface CreditsCardProps {
	/** Balance state — defaults to the live hub's loaded balance. */
	readonly state?: CreditsState;
}

/**
 * Credits balance card — a coin badge, the headline balance, its dollar
 * value, and a short explainer. Carries a soft yellow wash on the canonical
 * loaded state. The `state` prop selects one of the four gallery variants.
 *
 * @param state - Credits balance state to render
 * @returns The credits card
 */
export function CreditsCard({ state = 'loaded' }: CreditsCardProps) {
	const display = CREDITS_PRESETS[state];

	return (
		<section
			className={cn(
				'flex flex-col rounded-2xl border border-black/10 p-5 sm:p-6',
				state === 'loaded' ? 'bg-brand-yellow/40' : 'bg-white',
				display.locked && 'opacity-90',
			)}
		>
			<div className="flex items-center gap-3">
				<span
					className={cn(
						'flex size-11 shrink-0 items-center justify-center rounded-full',
						display.locked ? 'bg-black/5' : 'bg-brand-yellow',
					)}
				>
					{display.locked ? (
						<Lock className="text-ink-500 size-5" />
					) : (
						<Coins className="text-ink-900 size-5" />
					)}
				</span>
				<div className="flex flex-col">
					<h2 className="font-clash-display text-ink-900 text-2xl font-semibold">
						{display.title}
					</h2>
					<p className="text-ink-600 text-body-sm">{display.worth}</p>
				</div>
			</div>

			<div className="my-4 h-px bg-black/10" />

			<p className="text-ink-500 text-body-sm">{display.explainer}</p>
		</section>
	);
}
