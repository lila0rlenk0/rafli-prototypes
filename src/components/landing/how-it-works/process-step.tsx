import type { ReactNode } from 'react';

interface ProcessStepProps {
	number: number;
	icon: ReactNode;
	title: string;
	/** Short non-tech metaphor shown above the technical body. */
	analogy: string;
	children: ReactNode;
}

/**
 * Numbered card in the "How a winner is picked" flow. Analogy-first
 * structure is deliberate — non-tech readers get the mental model
 * instantly and tech readers get the concrete mechanism one line below.
 */
export function ProcessStep({
	number,
	icon,
	title,
	analogy,
	children,
}: ProcessStepProps) {
	return (
		<li className="bg-card rounded-xl border p-5">
			<div className="flex gap-4">
				<span className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold">
					{number}
				</span>
				<div className="min-w-0 flex-1">
					<h3 className="mb-1 flex items-center gap-2 font-semibold">
						{icon}
						{title}
					</h3>
					<p className="text-muted-foreground mb-2 text-sm italic">{analogy}</p>
					<p className="text-muted-foreground text-sm">{children}</p>
				</div>
			</div>
		</li>
	);
}
