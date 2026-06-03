import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const HUB_TITLE = 'Subscription Hub';
const HUB_DESCRIPTION =
	'Your winning kit — three daily games, a weekly streak, your plan, credits, and perks, all in one place.';

export const metadata: Metadata = {
	title: HUB_TITLE,
	description: HUB_DESCRIPTION,
	robots: {
		// Prototype surface — keep it out of search indexes.
		index: false,
		follow: false,
	},
};

interface PrototypeLayoutProps {
	readonly children: ReactNode;
}

/**
 * `(prototype)` route-group layout — a self-contained cream-canvas shell.
 *
 * Deliberately does NOT inherit `(protected)/layout.tsx`: this is a
 * visualization-only surface with no auth, no user fetch, and no realtime
 * providers. `min-h-dvh` beats `min-h-screen` on mobile Safari, and
 * `overflow-x-clip` contains the decorative background squares that bleed
 * past the centered content without spawning a horizontal scrollbar.
 *
 * `isolate` makes `<main>` its own stacking context so the `-z-10`
 * decorative layers (the starfield + accent blobs) paint above the cream
 * background but still behind the content.
 *
 * @param children - Route tree rendered inside the prototype shell
 * @returns Cream-canvas main wrapper
 */
export default function PrototypeLayout({ children }: PrototypeLayoutProps) {
	return (
		<main className="bg-background relative isolate min-h-dvh overflow-x-clip">
			{children}
		</main>
	);
}
