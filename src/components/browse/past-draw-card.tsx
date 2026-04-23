import { CheckCircle, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import type { Raffle } from '@/types/raffle';

interface PastDrawCardProps {
	raffle: Raffle;
}

/**
 * Card for a concluded raffle in the "Past Draws" grid on /browse.
 *
 * Privacy: the public `/raffles` endpoint strips winner identifiers from
 * the response (see backend `stripWinnerInternals` in raffles.public.api.ts).
 * That's why this card never tries to render a winner name — only the
 * verification badge ("Selected on-chain · verified") which conveys the
 * trust signal without exposing any per-winner detail. To surface specific
 * winners use the masked /winnings/recent feed instead.
 */
export function PastDrawCard({ raffle }: PastDrawCardProps) {
	// Inline consts rather than closures — matches RecentWinnerCard and
	// PastWinnersGroup in this folder and avoids recreating the helpers on
	// every render. Kept locale-fixed ('en-US') for SSR stability: this card
	// renders on the server and the server default locale wouldn't match the
	// client's, which would surface as a hydration mismatch.
	const hostName = raffle.host?.name ?? raffle.host?.username ?? 'Unknown';

	const ticketPrice = Number(raffle.ticketPriceAmount).toLocaleString('en-US', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	});

	// `endAt` is an ISO timestamp from the API; render month + day only —
	// concluded raffles don't need year/time granularity in the grid context
	// (the full datetime is on the detail page).
	const endedLabel = `Ended ${new Date(raffle.endAt).toLocaleDateString(
		'en-US',
		{ month: 'long', day: 'numeric' },
	)}`;

	return (
		<div
			data-testid="past-draw-card"
			className="relative flex w-full flex-col rounded-t-2xl rounded-b-3xl border border-transparent transition-colors duration-150 sm:hover:border-black"
		>
			{/* Image header — fixed 16:9 to match PublicRaffleCard so the live and
			    past sections share visual rhythm in the grid. */}
			<div className="relative aspect-video w-full overflow-hidden rounded-t-2xl bg-gray-100">
				{raffle.coverMediaUrl ? (
					<Image
						src={raffle.coverMediaUrl}
						alt={raffle.title}
						fill
						className="object-cover"
						sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
					/>
				) : (
					<div className="flex h-full items-center justify-center bg-gray-200">
						<span className="text-sm text-gray-400">No image</span>
					</div>
				)}
				{/* Verification banner overlay — green to echo the "live" success
				    palette. Sits flush at the top of the cover; the message is
				    deliberately winner-name-free per the privacy posture noted
				    in the component JSDoc above. `py-3` gives the banner enough
				    vertical weight to register as a deliberate band inside the
				    image — tighter padding read as a caption, which visually
				    detached the verification signal from the cover it anchors to. */}
				<div className="bg-brand-mint text-ink-900 absolute inset-x-0 top-0 flex items-center gap-2 px-4 py-3 text-xs">
					<ShieldCheck aria-hidden="true" className="size-4" />
					<span className="font-medium">Selected on-chain · verified</span>
				</div>
			</div>

			<div className="flex flex-1 flex-col gap-4 rounded-b-3xl bg-white p-6">
				<div className="flex flex-col gap-2">
					<h3 className="text-ink-alpha text-lg/none font-semibold">
						<Link
							href={`/browse/${raffle.publicSlugOrCode}`}
							className="line-clamp-1 after:absolute after:inset-0"
						>
							{raffle.title}
						</Link>
					</h3>

					<div className="flex items-center gap-2 sm:justify-between">
						<span className="text-ink-900 text-sm">by {hostName}</span>
						<span className="rounded-pill text-ink-900 inline-flex items-center gap-1 border border-black px-1 py-0.5 text-xs">
							<CheckCircle aria-hidden="true" className="size-3.5" />
							Verified host
						</span>
					</div>
				</div>

				<div className="flex items-center justify-between">
					<span className="font-clash-display tracking-micro text-navy text-2xl/tight font-semibold">
						${ticketPrice}
					</span>
					<span className="text-ink-500 text-sm">{endedLabel}</span>
				</div>
			</div>
		</div>
	);
}
