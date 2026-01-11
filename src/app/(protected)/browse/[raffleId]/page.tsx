import { Separator } from '@/components/ui/separator';
import { getCategoryLabel } from '@/constants/categories';
import { getRaffle } from '@/services/raffle/get-raffle';
import { Copy, Image as ImageIcon, InfoIcon, Minus, Plus } from 'lucide-react';
import Image from 'next/image';
import { FaXTwitter } from 'react-icons/fa6';
import { BuyButton } from './buy-button';
import { PaymentModalWrapper } from './payment-modal-wrapper';

interface PageProps {
	params: Promise<{
		raffleId: string;
	}>;
	searchParams: Promise<{
		session_id?: string;
	}>;
}

/**
 * Raffle Detail Page
 *
 * Displays full details of a specific raffle including cover image, gallery,
 * description, and category. Allows users to purchase tickets.
 *
 * Fetches data server-side using the getRaffle service.
 * Handles payment status modal after Stripe redirect.
 */
export default async function RafflePage({ params, searchParams }: PageProps) {
	const { raffleId } = await params;
	const response = await getRaffle(raffleId);

	if (!response.success) {
		return (
			<div className="flex h-[50vh] w-full items-center justify-center">
				<div className="text-center">
					<h3 className="text-lg font-medium text-red-600">
						Error loading raffle
					</h3>
					<p className="mt-2 text-gray-500">Failed to load raffle details</p>
				</div>
			</div>
		);
	}

	const raffle = response.data;

	/**
	 * Gets the host display name from closure
	 * Handles missing host data seamlessly
	 * @returns The host's name or default
	 */
	function getHostName(): string {
		if (!raffle.host || !raffle.host.name) return 'Raffle Host';

		return raffle.host.name;
	}

	/**
	 * Gets the first initial of the host's name from closure
	 * @returns The first character of the name or empty string
	 */
	function getHostInitial(): string {
		const name = getHostName();
		if (!name) return '';

		return name.charAt(0);
	}

	/**
	 * Gets the formatted raffle count for the host from closure
	 * @returns Formatted string with label
	 */
	function getHostRafflesCount(): string {
		// TODO: fetching real count if available in hostData
		// For now using 0 as per previous mock, or could be passed in raffle.host if updated
		const count = 0;
		return `${count} Raffles`;
	}

	return (
		<div className="container mx-auto flex max-w-4xl gap-8 px-4 py-8">
			<div className="flex w-full flex-col gap-6 overflow-hidden rounded-2xl bg-white p-6">
				<h1 className="text-3xl font-bold text-gray-900">{raffle.title}</h1>

				<div className="flex items-center gap-4">
					<div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xl font-semibold">
						{getHostInitial()}
					</div>
					<div className="flex min-w-0 flex-col font-medium">
						<span className="truncate text-sm">by {getHostName()}</span>
						<span className="text-xs">{getHostRafflesCount()}</span>
					</div>
				</div>

				<div className="flex flex-col gap-4">
					<div className="relative flex aspect-video max-h-96 w-full items-center justify-center overflow-hidden rounded-lg border border-[#E5E5E5] bg-white">
						{raffle.coverMediaUrl ? (
							<Image
								src={raffle.coverMediaUrl}
								alt={raffle.title}
								fill
								className="object-cover"
							/>
						) : (
							<ImageIcon className="size-12 text-gray-400" />
						)}
					</div>

					{raffle.galleryMediaUrls.length > 0 && (
						<div className="grid grid-cols-3 gap-4">
							{raffle.galleryMediaUrls.slice(0, 3).map((url, index) => (
								<div
									key={index}
									className="relative flex aspect-square max-h-32 w-full items-center justify-center overflow-hidden rounded-lg border border-[#E5E5E5] bg-white"
								>
									<Image
										src={url}
										alt={`Gallery ${index + 1}`}
										fill
										className="object-cover"
									/>
								</div>
							))}
						</div>
					)}
				</div>

				<div className="flex min-w-0 flex-col gap-2">
					<label className="text-sm text-[#B4B4B4]">Description</label>
					<p className="max-w-full text-sm wrap-anywhere">
						{raffle.description}
					</p>
				</div>

				<div className="flex flex-wrap gap-2">
					<div className="rounded-2xl bg-[#DFFFED] px-2 py-1">
						<span className="text-sm capitalize">
							{getCategoryLabel(raffle.categoryId)}
						</span>
					</div>
				</div>
			</div>

			<div className="space-y-2">
				<div className="h-fit space-y-4 rounded-2xl border border-black bg-white p-4">
					<h2 className="font-clash-display text-center text-xl font-semibold text-nowrap">
						The raffle is active!
					</h2>

					<div className="flex items-center justify-center gap-4 rounded-2xl bg-[#DFFFED] p-4">
						<div className="flex flex-col items-center gap-2">
							<p className="font-clash-display text-4xl font-semibold">03</p>
							<p className="text-sm text-[#7B7B7B]">Days</p>
						</div>
						<div className="flex flex-col items-center gap-2">
							<p className="font-clash-display text-4xl font-semibold">04</p>
							<p className="text-sm text-[#7B7B7B]">Hours</p>
						</div>
						<div className="flex flex-col items-center gap-2">
							<p className="font-clash-display text-4xl font-semibold">03</p>
							<p className="text-sm text-[#7B7B7B]">Minutes</p>
						</div>
						<div className="flex flex-col items-center gap-2">
							<p className="font-clash-display text-4xl font-semibold">03</p>
							<p className="text-sm text-[#7B7B7B]">Seconds</p>
						</div>
					</div>

					<div>
						<div className="flex items-center justify-between">
							<div className="flex items-baseline gap-1">
								<p className="font-clash-display text-3xl font-semibold">$5</p>
								<p className="text-sm text-[#7B7B7B]">per ticket</p>
							</div>
						</div>
						<div className="flex items-center justify-between">
							<p className="text-sm text-[#7B7B7B]">Number of tickets</p>

							<div className="flex items-center justify-center gap-6 rounded-full border border-black px-4 py-1">
								<Minus className="size-4" />
								<p className="text-lg">1</p>
								<Plus className="size-4" />
							</div>
						</div>
					</div>
					<div className="flex items-center justify-between gap-2">
						<button className="flex w-full items-center justify-center rounded-full border border-black py-2">
							<p className="text-sm">3 Tickets</p>
						</button>
						<button className="flex w-full items-center justify-center rounded-full border border-black py-2">
							<p className="text-sm">6 Tickets</p>
						</button>
						<button className="flex w-full items-center justify-center rounded-full border border-black py-2">
							<p className="text-sm">9 Tickets</p>
						</button>
					</div>

					<Separator className="my-4 bg-[#B4B4B4]" />

					<div className="flex items-center justify-between">
						<p className="text-sm text-[#7B7B7B]">Total</p>
						<p className="font-clash-display text-3xl font-semibold">$15</p>
					</div>

					<BuyButton raffleId={raffleId} />

					<div className="space-y-2">
						<div className="flex items-center justify-between text-sm">
							<span className="text-gray-500">
								{raffle.participantsCount}/{raffle.maxParticipants}
							</span>
							<span className="font-medium text-gray-900">
								{Math.round(0)}% filled
							</span>
						</div>

						<div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
							<div
								className="h-full bg-green-400 transition-all duration-300 ease-out"
								style={{ width: `${0}%` }}
							/>
						</div>

						<div className="flex items-center justify-between">
							<span className="text-sm font-medium text-gray-500">
								2 days left
							</span>
							<p>{raffle.status}</p>
						</div>
					</div>

					<div className="mt-6 flex items-center justify-between px-2">
						<button className="flex items-center gap-2 text-sm font-medium text-gray-700 transition-colors hover:text-black">
							<FaXTwitter className="h-4 w-4" />
							Share on X
						</button>
						<button className="flex items-center gap-2 text-sm font-medium text-gray-700 transition-colors hover:text-black">
							<Copy className="h-4 w-4" />
							Copy Raffle link
						</button>
					</div>
				</div>

				<div className="flex items-center justify-center gap-2">
					<InfoIcon className="size-4 text-[#7B7B7B]" />
					<p className="text-sm text-[#7B7B7B]">
						Youll only need KYC if you win
					</p>
				</div>
			</div>

			<PaymentModalWrapper raffleId={raffleId} searchParams={searchParams} />
		</div>
	);
}
