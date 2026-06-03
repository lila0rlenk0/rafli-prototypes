import { cn } from '@/lib/class-names';

interface HubLogoProps {
	readonly className?: string;
}

/**
 * RAFLI wordmark — a dark rounded "mark" tile beside the Clash Display
 * wordmark. Lightweight stand-in for the brand logo, scoped to the
 * prototype so we avoid wiring the production SVG asset.
 *
 * @param className - Optional wrapper overrides
 * @returns Inline logo lockup
 */
export function HubLogo({ className }: HubLogoProps) {
	return (
		<span className={cn('inline-flex items-center gap-2', className)}>
			<span className="bg-brand-dark flex size-6 items-center justify-center rounded-md">
				<span className="bg-brand-yellow size-2.5 rounded-sm" />
			</span>
			<span className="font-clash-display text-ink-900 text-lg font-semibold tracking-tight">
				RAFLI
			</span>
		</span>
	);
}
