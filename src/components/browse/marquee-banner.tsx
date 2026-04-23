// 'use client' — CSS marquee animation requires client rendering for smooth playback
'use client';

interface MarqueeBannerProps {
	/**
	 * Message to scroll. Required because the banner is reused across surfaces
	 * that each want different copy (browse listing vs active-raffle detail),
	 * and the previous hardcoded string leaked into pages where it was untrue
	 * (ticket-ids, concluded raffles, /pricing).
	 */
	readonly message: string;
}

export function MarqueeBanner({ message }: MarqueeBannerProps) {
	return (
		<div className="bg-brand-yellow sticky top-14 z-(--z-sticky-peak) overflow-hidden border-b border-black sm:top-16">
			<div className="animate-marquee flex items-center gap-2 py-3 whitespace-nowrap">
				{Array.from({ length: 8 }).map((_, i) => (
					<span key={i} className="flex items-center gap-2">
						<span className="text-navy text-lg font-semibold">{message}</span>
						<span className="bg-navy inline-block size-2 rounded-full" />
					</span>
				))}
			</div>
		</div>
	);
}
