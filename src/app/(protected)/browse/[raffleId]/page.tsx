import { getRaffle } from '@/services/raffle/get-raffle';
import { Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
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
		<div className="container mx-auto max-w-4xl px-4 py-8">
			<div className="flex w-full flex-col gap-6 overflow-hidden rounded-2xl bg-white p-6">
				<h1 className="text-3xl font-bold text-gray-900">{raffle.title}</h1>

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

				<div className="flex items-center gap-4">
					<div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xl font-semibold">
						{getHostInitial()}
					</div>
					<div className="flex min-w-0 flex-col font-medium">
						<span className="truncate text-sm">by {getHostName()}</span>
						<span className="text-xs">{getHostRafflesCount()}</span>
					</div>
				</div>

				<div className="flex min-w-0 flex-col gap-2">
					<label className="text-sm text-[#B4B4B4]">Description</label>
					<p className="max-w-full text-sm wrap-anywhere">
						{raffle.description}
					</p>
				</div>

				<div className="flex flex-wrap gap-2">
					<div className="rounded-2xl bg-[#DFFFED] px-2 py-1">
						<span className="text-sm capitalize">{raffle.categoryId}</span>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<BuyButton raffleId={raffleId} />
				</div>
			</div>

			<PaymentModalWrapper raffleId={raffleId} searchParams={searchParams} />
		</div>
	);
}
