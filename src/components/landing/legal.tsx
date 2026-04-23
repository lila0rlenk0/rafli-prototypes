import type { ReactNode } from 'react';

interface LegalSectionProps {
	title: string;
	children: ReactNode;
}

/**
 * Shared heading + body wrapper for a numbered legal clause. Used by
 * both `/privacy` and `/terms` so the visual rhythm is consistent and
 * copy updates touch exactly one renderer.
 */
export function LegalSection({ title, children }: LegalSectionProps) {
	return (
		<section>
			<h2 className="font-clash-display mb-2 text-2xl font-semibold">
				{title}
			</h2>
			<div className="text-muted-foreground">{children}</div>
		</section>
	);
}
