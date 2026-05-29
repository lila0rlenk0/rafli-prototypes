import type { ReactNode } from 'react';

import { cn } from '@/lib/class-names';

type SubscribeShellBackground = 'default' | 'mint';

interface SubscribeShellProps {
	readonly children: ReactNode;
	/** Canvas colour — `default` for purchase + success, `mint` for pending. */
	readonly background?: SubscribeShellBackground;
}

const BACKGROUND_CLASS: Record<SubscribeShellBackground, string> = {
	default: 'bg-background',
	mint: 'bg-brand-mint',
};

/**
 * Shared page shell for every subscribe-* surface (purchase, pending, success).
 *
 * `min-h-dvh` beats `min-h-screen` on mobile Safari (the browser chrome
 * respects dvh). `overflow-x-clip` contains the countdown + CTA full-bleed
 * sections that escape the centered `max-w-hero` wrapper via
 * `w-screen left-1/2 -translate-x-1/2`. Without it, viewports wider than
 * 1440px would scroll horizontally because `100vw` outruns the centered
 * wrapper. `clip` (not `hidden`) avoids creating a scroll container and keeps
 * the decorative hero shapes visible.
 *
 * @param children - Page tree rendered inside the subscribe-* route
 * @param background - Canvas colour token; defaults to cream `bg-background`
 * @returns Main wrapper sized and clipped for the post-payment funnel
 */
export function SubscribeShell({
	children,
	background = 'default',
}: SubscribeShellProps) {
	return (
		<main
			className={cn(
				'relative min-h-dvh overflow-x-clip',
				BACKGROUND_CLASS[background],
			)}
		>
			{children}
		</main>
	);
}
