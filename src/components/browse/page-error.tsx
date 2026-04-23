import Link from 'next/link';

import { BugIcon } from '@/assets/icons/bug-icon';

/**
 * Fallback shown when the primary raffle fetch fails. Isolated from the
 * page shell so the RSC body can return it in a single line after the
 * guard clause, keeping the primary render path front-and-centre.
 */
export function BrowsePageError() {
	return (
		<div className="h-half-screen flex w-full flex-col items-center justify-center gap-10 text-center">
			<BugIcon />

			<hgroup className="flex flex-col gap-4">
				<h2 className="text-xl font-semibold">Error loading sweepstakes</h2>
				<p className="mt-2 text-lg">
					Something went wrong while trying to load the sweepstakes.
				</p>
			</hgroup>

			<Link
				href="/browse"
				className="rounded-full border border-black px-12 py-3 text-sm font-semibold text-black transition-colors"
			>
				Back to Browse
			</Link>
		</div>
	);
}
