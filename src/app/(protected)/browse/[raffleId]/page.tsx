import { RaffleCountdown } from '@/components/raffle/raffle-countdown';
import { RaffleShareButtons } from '@/components/raffle/raffle-share-buttons';
import { TicketPurchaseCard } from '@/components/raffle/ticket-purchase-card';
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';
import { getCategoryLabel } from '@/constants/categories';
import { getRaffle } from '@/services/raffle/get-raffle';
import { Image as ImageIcon, InfoIcon } from 'lucide-react';
import Image from 'next/image';
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
		let count = 0;
		if (raffle.host?.totalRaffles) {
			count = raffle.host.totalRaffles;
		}
		return `${count} Raffles`;
	}

	/**
	 * Parses the ticket price from string to number
	 * @param priceString - Price as string from API
	 * @returns Parsed price as number
	 */
	function parseTicketPrice(priceString: string): number {
		return parseFloat(priceString);
	}

	/**
	 * Calculates the fill percentage for the raffle
	 * @param participantsCount - Current number of participants
	 * @param maxParticipants - Maximum number of participants
	 * @returns Rounded percentage as number
	 */
	function calculateFillPercentage(
		participantsCount: number,
		maxParticipants: number,
	): number {
		if (maxParticipants === 0) return 0;
		return Math.round((participantsCount / maxParticipants) * 100);
	}

	/**
	 * Gets the progress bar width as a percentage string
	 * @param participantsCount - Current number of participants
	 * @param maxParticipants - Maximum number of participants
	 * @returns Percentage string for width style (e.g., "50%")
	 */
	function getProgressBarWidth(
		participantsCount: number,
		maxParticipants: number,
	): string {
		if (maxParticipants === 0) return '0%';
		const percentage = (participantsCount / maxParticipants) * 100;
		return `${percentage}%`;
	}

	// Calculate values before return
	const ticketPrice = parseTicketPrice(raffle.ticketPriceAmount);
	const fillPercentage = calculateFillPercentage(
		raffle.participantsCount,
		raffle.maxParticipants,
	);
	const progressWidth = getProgressBarWidth(
		raffle.participantsCount,
		raffle.maxParticipants,
	);

	return (
		<div className="container mx-auto flex max-w-6xl gap-8 px-4 py-8">
			<div className="w-full space-y-4">
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

						<div className="grid grid-cols-3 gap-4">
							{Array.from({ length: 3 }).map((_, index) => {
								const imageUrl = raffle.galleryMediaUrls[index];
								return (
									<div
										key={index}
										className="relative flex aspect-square max-h-32 w-full items-center justify-center overflow-hidden rounded-lg border border-[#E5E5E5] bg-white"
									>
										{imageUrl ? (
											<Image
												src={imageUrl}
												alt={`Gallery ${index + 1}`}
												fill
												className="object-cover"
											/>
										) : (
											<ImageIcon className="size-6 text-gray-400" />
										)}
									</div>
								);
							})}
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
							<span className="text-sm capitalize">
								{getCategoryLabel(raffle.categoryId)}
							</span>
						</div>
					</div>
				</div>

				<div className="flex w-full flex-col gap-4 overflow-hidden rounded-2xl bg-white p-6">
					<h2 className="text-xl font-semibold">FAQ</h2>
					<Accordion type="single" collapsible className="w-full space-y-4">
						<AccordionItem value="how-it-works" className="border-none">
							<AccordionTrigger className="rounded-lg bg-[#E1F8FF] px-4 py-3 hover:no-underline">
								How it works?
							</AccordionTrigger>
							<AccordionContent className="text-muted-foreground px-4 pt-4 text-sm">
								The raffle is a simple and fair way to win prizes. You can
								purchase tickets to increase your chances of winning. The winner
								will be randomly selected when the raffle ends.
							</AccordionContent>
						</AccordionItem>

						<AccordionItem value="rules-eligibility" className="border-none">
							<AccordionTrigger className="rounded-lg bg-[#E1F8FF] px-4 py-3 hover:no-underline">
								Rules and Eligibility
							</AccordionTrigger>
							<AccordionContent className="text-muted-foreground px-4 pt-4 text-sm">
								Participants must be 18 years or older to enter. You can
								purchase multiple tickets to increase your chances of winning.
								Winners will be notified via email and must complete KYC
								verification to claim their prize. All sales are final and
								non-refundable.
							</AccordionContent>
						</AccordionItem>
					</Accordion>
				</div>
			</div>

			<div className="space-y-2">
				<div className="h-fit space-y-4 rounded-2xl border border-black bg-white px-4 py-8">
					<h2 className="font-clash-display text-center text-xl font-semibold text-nowrap">
						The raffle is active!
					</h2>

					<RaffleCountdown endAt={raffle.endAt} />

					<TicketPurchaseCard
						raffleId={raffleId}
						price={ticketPrice}
						currency={raffle.ticketPriceCurrency}
						maxParticipants={raffle.maxParticipants}
						participantsCount={raffle.participantsCount}
					/>

					<div className="space-y-2">
						<div className="flex items-center justify-between text-sm">
							<span className="text-[#7B7B7B]">
								{raffle.participantsCount}/{raffle.maxParticipants}
							</span>
							<span className="font-medium text-[#7B7B7B]">
								{fillPercentage}% filled
							</span>
						</div>

						<div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
							<div
								className="h-full bg-green-400 transition-all duration-300 ease-out"
								style={{ width: progressWidth }}
							/>
						</div>
					</div>

					<RaffleShareButtons
						title={raffle.title}
						publicSlugOrCode={raffle.publicSlugOrCode}
					/>
				</div>

				<div className="flex items-center justify-center gap-2">
					<InfoIcon className="size-4 text-[#7B7B7B]" />
					<p className="text-sm text-[#7B7B7B]">
						You&apos;ll only need KYC if you win
					</p>
				</div>
			</div>

			<PaymentModalWrapper raffleId={raffleId} searchParams={searchParams} />
		</div>
	);
}
