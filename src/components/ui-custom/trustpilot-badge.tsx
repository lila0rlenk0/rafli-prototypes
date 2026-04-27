import type { ComponentProps } from 'react';

import { cn } from '@/lib/class-names';

// 5 is the Trustpilot rating ceiling — rendering the full strip even
// when the rating is <5 is intentional: filled green tiles signal the
// platform, the numeric score carries the actual value. This matches
// Trustpilot's own badge rendering.
const STAR_COUNT = 5;

// Hardcoded in copy so the score is a single source of truth for /browse
// (future), /subscribe, and the navbar. If it ever needs to be dynamic,
// promote to a prop without touching callers that want the default.
const TRUSTPILOT_SCORE = '4.8';

interface TrustpilotBadgeProps {
	/** Classes merged onto the root flex row — typically responsive visibility. */
	className?: string;
}

/**
 * Trust signal badge shown on public marketing surfaces.
 *
 * Composes the Trustpilot star row + score + wordmark into a single
 * horizontal pill. Lives in `ui-custom/` because it composes raw SVGs
 * rather than a shadcn primitive and is reused across /subscribe
 * (navbar + hero mobile) with room to add /browse or /pricing later.
 *
 * @param className - Responsive visibility classes (e.g. `hidden sm:flex`)
 * @returns Horizontal row of 5 filled stars, numeric score, and "Trustpilot" wordmark
 */
export function TrustpilotBadge({ className }: TrustpilotBadgeProps) {
	return (
		<div className={cn('flex items-center gap-2', className)}>
			<div className="flex items-center gap-0.5">
				{Array.from({ length: STAR_COUNT }).map((_, i) => (
					<TrustpilotStar key={i} />
				))}
			</div>
			<span className="text-navy text-label-sm font-semibold sm:text-sm">
				{TRUSTPILOT_SCORE}
			</span>
			<span className="text-navy text-label-sm font-semibold sm:text-sm">
				Trust<span className="text-trustpilot">pilot</span>
			</span>
		</div>
	);
}

/**
 * Single Trustpilot star tile rendered in brand green (`--color-trustpilot`).
 *
 * Not extracted to its own file because the wordmark half-green lives
 * in the same visual vocabulary — both consumers are the parent badge.
 *
 * @returns 16px rounded green square with a centred white star glyph
 */
function TrustpilotStar(props: ComponentProps<'svg'>) {
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 16 16"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden
			className="sm:size-4"
			{...props}
		>
			<rect width="16" height="16" rx="1" className="fill-trustpilot" />
			<path
				d="M8 2.5l1.5 3.1 3.4.3-2.5 2.2.7 3.4L8 9.6 4.9 11.5l.7-3.4-2.5-2.2 3.4-.3L8 2.5z"
				fill="white"
			/>
		</svg>
	);
}
