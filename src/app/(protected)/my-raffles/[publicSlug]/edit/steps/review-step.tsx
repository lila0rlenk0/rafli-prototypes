'use client';

import { Button } from '@/components/ui/button';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import { formatDate } from '@/lib/utils/date-format';
import { Clock, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { useMemo } from 'react';
import { useEditForm } from '../edit-form-provider';

/**
 * ReviewStep for Edit Form
 *
 * Displays a preview of all raffle data before saving changes.
 * Shows existing images or new uploads.
 */
export function ReviewStep() {
	const {
		form,
		isUpdating,
		existingCoverUrl,
		existingGalleryUrls,
		originalRaffle,
		categories,
		userName,
		totalRaffles,
	} = useEditForm();

	const formValues = form.watch();
	const {
		description,
		price,
		category,
		coverImage,
		startDate,
		endDate,
		pricePerTicket,
		numberOfWinners,
		minParticipants,
		maxParticipants,
		checkInQuestion,
	} = formValues;

	/**
	 * Checks if form has any changes
	 * Compares current form values with original raffle data
	 * Uses useMemo to recalculate when form values change
	 */
	const hasChanges = useMemo(() => {
		// Check for new images (new uploads)
		// If coverImage array has items, it means user uploaded new images
		if (coverImage && coverImage.length > 0) {
			return true;
		}

		// Ensure all values are defined before comparison
		if (
			!description ||
			price === undefined ||
			price === null ||
			!category ||
			!startDate ||
			!endDate ||
			pricePerTicket === undefined ||
			pricePerTicket === null ||
			numberOfWinners === undefined ||
			numberOfWinners === null ||
			minParticipants === undefined ||
			minParticipants === null ||
			maxParticipants === undefined ||
			maxParticipants === null ||
			!checkInQuestion
		) {
			return false;
		}

		// Check field changes
		// Normalize dates for comparison - extract date part from ISO string
		const originalStartDate = originalRaffle.startAt.split('T')[0];
		const originalEndDate = originalRaffle.endAt.split('T')[0];

		// Category is now stored as UUID directly
		const originalCategoryId = originalRaffle.categoryId || '';

		// Question ID is also stored as UUID directly
		const originalCheckInQuestionId = originalRaffle.questionId || '';

		// Compare price values (handle floating point precision)
		const currentPrice = parseFloat(price.toString());
		const originalPrice = parseFloat(originalRaffle.declaredValueAmount);
		const priceChanged = Math.abs(currentPrice - originalPrice) > 0.0001;

		// Compare ticket price values (handle floating point precision)
		const currentTicketPrice = parseFloat(pricePerTicket.toString());
		const originalTicketPrice = parseFloat(originalRaffle.ticketPriceAmount);
		const ticketPriceChanged =
			Math.abs(currentTicketPrice - originalTicketPrice) > 0.0001;

		return (
			description !== originalRaffle.description ||
			priceChanged ||
			category !== originalCategoryId ||
			startDate !== originalStartDate ||
			endDate !== originalEndDate ||
			ticketPriceChanged ||
			numberOfWinners !== originalRaffle.numberOfWinners ||
			minParticipants !== originalRaffle.minParticipants ||
			maxParticipants !== originalRaffle.maxParticipants ||
			checkInQuestion !== originalCheckInQuestionId
		);
	}, [
		coverImage,
		description,
		price,
		category,
		startDate,
		endDate,
		pricePerTicket,
		numberOfWinners,
		minParticipants,
		maxParticipants,
		checkInQuestion,
		originalRaffle,
	]);

	/**
	 * Gets the main cover image source
	 * Returns uploaded file URL or existing cover URL
	 */
	function getCoverImageSrc(): string | null {
		if (coverImage?.[0]) {
			return URL.createObjectURL(coverImage[0]);
		}
		return existingCoverUrl;
	}

	const coverImageSrc = getCoverImageSrc();

	/**
	 * Gets a gallery image source at the given index
	 * Returns uploaded file URL, existing gallery URL, or null
	 */
	function getGalleryImageSrc(index: number): string | null {
		// coverImage[0] is cover, [1], [2], [3] are gallery
		const galleryFileIndex = index + 1;
		if (coverImage?.[galleryFileIndex]) {
			return URL.createObjectURL(coverImage[galleryFileIndex]);
		}
		if (existingGalleryUrls[index]) {
			return existingGalleryUrls[index];
		}
		return null;
	}

	/**
	 * Gets the first letter of the user's name
	 */
	function getUserInitial(): string {
		if (!userName) return '';
		return userName.charAt(0);
	}

	/**
	 * Gets the user's full name
	 */
	function getUserName(): string {
		return userName || 'Raffle Host';
	}

	/**
	 * Gets the total number of raffles created by the user
	 */
	function getTotalRaffles(): number {
		return totalRaffles;
	}

	/**
	 * Gets the raffle description
	 */
	function getDescription() {
		return description;
	}

	/**
	 * Gets the raffle category display name
	 * Looks up category name from the ID
	 */
	function getCategoryName(): string {
		if (!category) return '';
		const cat = categories.find(c => c.id === category);
		return cat?.name || '';
	}

	/**
	 * Gets the declared value formatted as currency
	 */
	function getDeclaredValue() {
		return `$${price?.toFixed(2)}`;
	}

	/**
	 * Gets the participants range as a formatted string
	 */
	function getParticipantsRange() {
		return `${minParticipants} - ${maxParticipants}`;
	}

	/**
	 * Gets the price per ticket formatted as currency
	 */
	function getPricePerTicket() {
		return `$${pricePerTicket?.toFixed(2)}`;
	}

	/**
	 * Gets the active time period as a formatted date range
	 */
	function getActivePeriod() {
		return `${formatDate(startDate)} - ${formatDate(endDate)}`;
	}

	/**
	 * Checks if the raffle will start now based on start date
	 */
	function checkWillStartNow() {
		if (!startDate) return false;

		const [year, month, day] = startDate.split('-').map(Number);
		const start = new Date(year, month - 1, day);

		const today = new Date();
		const todayNormalized = new Date(
			today.getFullYear(),
			today.getMonth(),
			today.getDate(),
		);

		return start <= todayNormalized;
	}

	const willStartNow = checkWillStartNow();

	return (
		<div className="flex w-full flex-col gap-6 overflow-hidden rounded-2xl bg-white p-6">
			<div className="flex flex-col gap-4">
				<div className="relative flex aspect-video max-h-64 w-full items-center justify-center overflow-hidden rounded-lg border border-[#E5E5E5] bg-white">
					{coverImageSrc ? (
						<Image
							src={coverImageSrc}
							alt="Cover"
							fill
							sizes="100vw"
							className="object-cover"
							unoptimized={coverImage?.[0] !== undefined}
						/>
					) : (
						<ImageIcon className="size-12 text-gray-400" />
					)}
				</div>

				<div className="grid grid-cols-3 gap-4">
					{Array.from({ length: 3 }).map((_, index) => {
						const src = getGalleryImageSrc(index);
						return (
							<div
								key={index}
								className="relative flex aspect-square max-h-24 w-full items-center justify-center overflow-hidden rounded-lg border border-[#E5E5E5] bg-white"
							>
								{src ? (
									<Image
										src={src}
										alt={`Gallery ${index + 1}`}
										fill
										sizes="33vw"
										className="object-cover"
										unoptimized={coverImage?.[index + 1] !== undefined}
									/>
								) : (
									<ImageIcon className="size-6 text-gray-400" />
								)}
							</div>
						);
					})}
				</div>
			</div>

			<div className="flex items-center gap-4">
				<div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xl font-semibold">
					{getUserInitial()}
				</div>
				<div className="flex min-w-0 flex-col font-medium">
					<span className="truncate text-sm">by {getUserName()}</span>
					<span className="text-xs">{getTotalRaffles()} Raffles</span>
				</div>
			</div>

			<div className="flex min-w-0 flex-col gap-2">
				<label className="text-sm text-[#B4B4B4]">Description</label>
				<MarkdownRenderer
					content={getDescription() || ''}
					className="text-sm"
				/>
			</div>

			<div className="flex flex-wrap gap-2">
				{getCategoryName() && (
					<div className="rounded-2xl bg-[#DFFFED] px-2 py-1">
						<span className="text-sm capitalize">{getCategoryName()}</span>
					</div>
				)}
			</div>

			<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
				<div className="flex min-w-0 flex-col gap-2">
					<label className="text-sm text-[#B4B4B4]">Declared Value</label>
					<p className="truncate text-sm font-medium">{getDeclaredValue()}</p>
				</div>

				<div className="flex min-w-0 flex-col gap-2">
					<label className="text-sm text-[#B4B4B4]">Participants</label>
					<p className="truncate text-sm font-medium">
						{getParticipantsRange()}
					</p>
				</div>

				<div className="flex min-w-0 flex-col gap-2">
					<label className="text-sm text-[#B4B4B4]">Price per ticket</label>
					<p className="truncate text-sm font-medium">{getPricePerTicket()}</p>
				</div>

				<div className="flex min-w-0 flex-col gap-2">
					<label className="text-sm text-[#B4B4B4]">Active time period</label>
					<p className="wrap-break-words text-sm font-medium">
						{getActivePeriod()}
					</p>
				</div>
			</div>

			{willStartNow && (
				<div className="flex w-full items-center justify-between rounded-lg bg-[#E1F8FF] p-4">
					<div className="flex items-center gap-2">
						<Clock className="size-6 text-[#2870BD]" />
						<span className="text-xs">
							The raffle will start immediately after saving.
						</span>
					</div>
				</div>
			)}

			<div className="flex items-center gap-2">
				<Button
					type="submit"
					disabled={isUpdating || !hasChanges}
					className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
				>
					{isUpdating ? 'Saving...' : 'Save Changes'}
				</Button>
			</div>
		</div>
	);
}
