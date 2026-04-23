'use client';

import type { ReactNode } from 'react';

/**
 * Green uppercase label that anchors each section heading. Kept in its
 * own component so copy edits to the badge style touch one file.
 */
export function SectionLabel({ children }: { children: ReactNode }) {
	return (
		<div className="tracking-caps-5 text-green-strong mb-3.5 text-xs font-bold uppercase">
			{children}
		</div>
	);
}

interface PullQuoteProps {
	quote: string;
	attribution: string;
}

/**
 * Pull-quote block used twice in the article — decorative oversized
 * quotation mark on dark background, attribution in cream green.
 */
export function PullQuote({ quote, attribution }: PullQuoteProps) {
	return (
		<div className="bg-brand-dark relative my-12 overflow-hidden rounded-2xl px-11 py-9">
			<span className="font-clash-display text-brand-mint/15 text-160/none pointer-events-none absolute -top-5 left-7 select-none">
				&ldquo;
			</span>
			<p className="font-clash-display text-display-fluid-md/dense tracking-display-sm relative z-10 font-bold text-white">
				{quote}
			</p>
			<span className="text-brand-mint text-mini mt-3.5 block font-light">
				{attribution}
			</span>
		</div>
	);
}

export type FeatureColor = 'sky' | 'yellow' | 'green' | 'gray';

interface FeatureCardProps {
	num: string;
	title: string;
	description: string;
	color: FeatureColor;
}

/**
 * Maps the semantic color name to a Tailwind background class. Runs as
 * an exhaustive switch over the `FeatureColor` union so a new variant
 * fails the type check rather than defaulting silently.
 */
function getColorClass(color: FeatureColor): string {
	switch (color) {
		case 'sky':
			return 'bg-brand-sky';
		case 'yellow':
			return 'bg-brand-yellow';
		case 'green':
			return 'bg-brand-mint';
		case 'gray':
			return 'bg-neutral-100';
	}
}

/**
 * Feature card with numbered heading and colored background — four are
 * rendered in the "Solution" grid.
 */
export function FeatureCard({
	num,
	title,
	description,
	color,
}: FeatureCardProps) {
	return (
		<div className={`rounded-2xl px-7 py-7.5 ${getColorClass(color)}`}>
			<div className="font-clash-display text-mini tracking-caps-2 mb-2.5 font-bold text-black/30">
				{num}
			</div>
			<h4 className="font-clash-display mb-2 text-lg font-bold tracking-[-0.3px]">
				{title}
			</h4>
			<p className="text-sm/relaxed text-black/60">{description}</p>
		</div>
	);
}

interface StepItemProps {
	number: number;
	children: ReactNode;
}

/**
 * Numbered step item with a pill badge — five are rendered in the
 * "How It Works" section.
 */
export function StepItem({ number, children }: StepItemProps) {
	return (
		<div className="flex items-start gap-4.5 rounded-xl bg-neutral-100 px-5 py-4.5">
			<div className="bg-brand-dark text-brand-mint font-clash-display text-label grid size-8.5 shrink-0 place-items-center rounded-xl font-extrabold">
				{number}
			</div>
			<p className="text-foreground/80 text-label">{children}</p>
		</div>
	);
}

/** Press release image paths in display order. */
export const PRESS_IMAGES = {
	banner: '/press/banner.png',
	raffleList: '/press/raffle-list.png',
	raffleDetails: '/press/raffle-details.png',
	footer: '/press/footer.png',
} as const;
