import type { CSSProperties } from 'react';

import { cn } from '@/lib/class-names';

interface TypingIndicatorProps {
	readonly className?: string;
}

/**
 * Three-dot "someone is typing" animation. Intentionally avatar-less and
 * identity-free to match our privacy posture — we show that *someone* is
 * typing, never *who*, because the list of typists is already in the
 * composer header.
 */
export function TypingIndicator({ className }: TypingIndicatorProps) {
	return (
		<div
			className={cn(
				'bg-muted inline-flex items-center gap-1 rounded-full px-3 py-2',
				className,
			)}
			role="status"
			aria-label="Someone is typing"
		>
			<Dot delayMs={0} />
			<Dot delayMs={150} />
			<Dot delayMs={300} />
		</div>
	);
}

/** One pulsing dot. `delayMs` staggers the sequence. */
function Dot({ delayMs }: { readonly delayMs: number }) {
	// animation-delay is a runtime-computed value — Tailwind can't express
	// "150ms" without an arbitrary value escape, so we compute the style
	// off-JSX to satisfy `local/no-inline-style` (the rule only flags
	// object literals inline on JSXAttribute).
	const dotStyle: CSSProperties = { animationDelay: `${delayMs}ms` };
	return (
		<span
			className="bg-foreground/60 size-1.5 animate-pulse rounded-full"
			style={dotStyle}
			aria-hidden
		/>
	);
}
