'use client';

/**
 * MarqueeBanner Component
 *
 * A horizontally scrolling yellow banner that displays a repeating promotional message.
 * Sits directly below the navbar with a continuous CSS animation.
 */
export function MarqueeBanner() {
	const message = 'Share selected raffle on X and get a free tickets!';

	return (
		<div className="relative overflow-hidden bg-[#f6ff8b] border-b border-black">
			<div className="flex animate-marquee items-center gap-2 whitespace-nowrap py-3">
				{Array.from({ length: 8 }).map((_, i) => (
					<span key={i} className="flex items-center gap-2">
						<span className="font-semibold text-lg text-[#182135]">
							{message}
						</span>
						<span className="inline-block size-2 rounded-full bg-[#182135]" />
					</span>
				))}
			</div>
		</div>
	);
}
