import type { ReactNode } from 'react';

import { cn } from '@/lib/class-names';

/** Title scale — `hero` is the oversized landing headline. */
const TITLE_SIZE = {
	default: 'text-3xl sm:text-4xl',
	hero: 'text-4xl sm:text-5xl lg:text-6xl',
} as const;

interface PageHeaderProps {
	readonly eyebrow: string;
	readonly title: string;
	readonly subtitle: string;
	/**
	 * Optional block rendered right-aligned on the title's line (e.g. the
	 * hero credits badge). The title itself stays left-aligned.
	 */
	readonly aside?: ReactNode;
	/** Title scale — `hero` enlarges the headline for the page hero. */
	readonly size?: keyof typeof TITLE_SIZE;
}

/**
 * Section header — uppercase eyebrow, Clash Display headline, supporting
 * subtitle. Reused for the hub hero and the mobile-only games intro. An
 * optional `aside` sits opposite the title on the same horizontal line.
 *
 * @param eyebrow - Small uppercase kicker above the title
 * @param title - Clash Display headline (kept left-aligned)
 * @param subtitle - Supporting line beneath the title
 * @param aside - Optional right-aligned block on the title row
 * @param size - Title scale (`default` or `hero`)
 * @returns Stacked header block
 */
export function PageHeader({
	eyebrow,
	title,
	subtitle,
	aside,
	size = 'default',
}: PageHeaderProps) {
	return (
		<div className="flex flex-col gap-2">
			<p className="text-ink-500 text-label-sm font-semibold tracking-wider uppercase">
				{eyebrow}
			</p>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h1
					className={cn(
						'font-clash-display text-ink-900 my-2 font-semibold',
						TITLE_SIZE[size],
					)}
				>
					{title}
				</h1>
				{aside ? <div className="shrink-0">{aside}</div> : null}
			</div>
			<p className="text-ink-600 text-body-md max-w-2xl">{subtitle}</p>
		</div>
	);
}
