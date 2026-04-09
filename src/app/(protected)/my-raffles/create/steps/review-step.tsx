'use client';

import { Button } from '@/components/ui/button';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import { cn } from '@/lib/utils';
import { getCryptoSummary } from '@/lib/utils/crypto-form';
import { formatDateTime } from '@/lib/utils/date-format';
import { Clock } from 'lucide-react';
import { useMultiStepForm } from '../multi-step-form-provider';
import { ImagePreview } from './image-preview';

/**
 * ReviewStep Component
 *
 * Final step of the raffle creation wizard. Displays a read-only preview
 * of all form data so the host can verify before submitting.
 * Uses ImagePreview for blob URL lifecycle management (avoids memory leaks
 * from inline URL.createObjectURL calls that never get revoked).
 *
 * @returns Form review card with submit button
 */
export function ReviewStep() {
	const {
		form,
		isCreating,
		isRaffleCreated,
		userName,
		totalRaffles,
		categories,
		pendingPromoCodes,
	} = useMultiStepForm();

	const formValues = form.watch();
	const {
		description,
		price,
		category,
		coverImage,
		startDate,
		startTime,
		endDate,
		endTime,
		pricePerTicket,
		minParticipants,
		maxParticipants,
	} = formValues;

	/**
	 * Gets the first letter of the user's name
	 */
	function getUserInitial() {
		if (!userName) return '';
		return userName.charAt(0);
	}

	/**
	 * Gets the user's full name
	 */
	function getUserName() {
		return userName || 'Raffle Host';
	}

	/**
	 * Gets the total number of raffles created by the user
	 */
	function getTotalRaffles() {
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
		return `${formatDateTime(startDate, startTime)} - ${formatDateTime(endDate, endTime)}`;
	}

	/**
	 * Gets total pending promo code count
	 */
	function getTotalPromoCodeCount(): number {
		return pendingPromoCodes.reduce((sum, batch) => sum + batch.count, 0);
	}

	/**
	 * Checks if pending promo codes should be shown in the review
	 */
	function hasPromoCodes(): boolean {
		return pendingPromoCodes.length > 0;
	}

	/**
	 * Checks if the raffle should show the start now warning
	 * Combines date + time for accurate comparison
	 */
	function shouldShowStartNowWarning() {
		if (!startDate) return false;
		const start = new Date(`${startDate}T${startTime || '00:00'}`);
		return start <= new Date();
	}

	return (
		<div className="flex w-full flex-col gap-6 overflow-hidden rounded-2xl bg-white p-8">
			{/* Cover + gallery preview — uses ImagePreview for safe blob URL lifecycle */}
			<div className="flex flex-col gap-4">
				<div className="relative flex aspect-video max-h-64 w-full items-center justify-center overflow-hidden rounded-lg border border-[#E5E5E5] bg-white">
					<ImagePreview
						file={coverImage?.[0]}
						alt="Cover"
						className="object-cover"
					/>
				</div>

				<div className="grid grid-cols-3 gap-4">
					{Array.from({ length: 3 }).map((_, index) => {
						const file = coverImage?.[index + 1];
						return (
							<div
								key={index}
								className="relative flex aspect-square max-h-24 w-full items-center justify-center overflow-hidden rounded-lg border border-[#E5E5E5] bg-white"
							>
								<ImagePreview
									file={file}
									alt={`Preview ${index + 2}`}
									className="object-cover"
								/>
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
				{getCategoryName() ? (
					<div className="rounded-2xl bg-[#DFFFED] px-2 py-1">
						<span className="text-sm capitalize">{getCategoryName()}</span>
					</div>
				) : null}
			</div>

			<div
				className={cn(
					'grid grid-cols-2 gap-4',
					hasPromoCodes() ? 'lg:grid-cols-3' : 'lg:grid-cols-4',
				)}
			>
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

				{hasPromoCodes() ? (
					<div className="flex min-w-0 flex-col gap-2">
						<label className="text-sm text-[#B4B4B4]">Promo Codes</label>
						<p className="truncate text-sm font-medium">
							{getTotalPromoCodeCount()}
						</p>
					</div>
				) : null}

				<div className="flex min-w-0 flex-col gap-2">
					<label className="text-sm text-[#B4B4B4]">Payment</label>
					<p className="truncate text-sm font-medium">
						{getCryptoSummary(
							formValues.acceptsCrypto,
							formValues.cryptoChainIds,
							formValues.cryptoTokens,
						)}
					</p>
				</div>
			</div>

			{shouldShowStartNowWarning() ? (
				<div className="flex w-full items-center justify-between rounded-lg bg-[#E1F8FF] p-4">
					<div className="flex items-center gap-2">
						<Clock className="size-4 text-[#2870BD]" />
						<span className="text-sm">The raffle will start now.</span>
					</div>
				</div>
			) : null}

			<div className="flex items-center gap-2">
				<Button
					type="submit"
					disabled={isCreating || isRaffleCreated}
					className="cursor-pointer"
				>
					{isCreating ? 'Creating...' : 'Create'}
				</Button>
			</div>
		</div>
	);
}
