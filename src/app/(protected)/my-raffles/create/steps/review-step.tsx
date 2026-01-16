'use client';

import { Button } from '@/components/ui/button';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import { Clock, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { useMultiStepForm } from '../multi-step-form-provider';

export function ReviewStep() {
	const { form, isCreating, isRaffleCreated, userName, totalRaffles } =
		useMultiStepForm();

	const formValues = form.watch();
	const {
		description,
		price,
		category,
		coverImage,
		startDate,
		endDate,
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
	 * Gets the raffle category
	 */
	function getCategory() {
		return category;
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
	 * Formats a date string to a readable format
	 */
	function formatDate(dateString: string) {
		if (!dateString) return '';
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		});
	}

	/**
	 * Gets the active time period as a formatted date range
	 */
	function getActivePeriod() {
		return `${formatDate(startDate)} - ${formatDate(endDate)}`;
	}

	/**
	 * Checks if the raffle should show the start now warning
	 */
	function shouldShowStartNowWarning() {
		return startDate && new Date(startDate) < new Date();
	}

	return (
		<div className="flex w-full flex-col gap-6 overflow-hidden rounded-2xl bg-white p-6">
			<div className="flex flex-col gap-4">
				<div className="relative flex aspect-video max-h-64 w-full items-center justify-center overflow-hidden rounded-lg border border-[#E5E5E5] bg-white">
					{coverImage?.[0] ? (
						<Image
							src={URL.createObjectURL(coverImage[0])}
							alt="Cover"
							fill
							className="object-cover"
						/>
					) : (
						<ImageIcon className="size-12 text-gray-400" />
					)}
				</div>

				<div className="grid grid-cols-3 gap-4">
					{Array.from({ length: 3 }).map((_, index) => {
						const file = coverImage?.[index + 1];
						return (
							<div
								key={index}
								className="relative flex aspect-square max-h-24 w-full items-center justify-center overflow-hidden rounded-lg border border-[#E5E5E5] bg-white"
							>
								{file ? (
									<Image
										src={URL.createObjectURL(file)}
										alt={`Preview ${index + 2}`}
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
				{getCategory() && (
					<div className="rounded-2xl bg-[#DFFFED] px-2 py-1">
						<span className="text-sm capitalize">{getCategory()}</span>
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

			{shouldShowStartNowWarning() && (
				<div className="flex w-full items-center justify-between rounded-lg bg-[#E1F8FF] p-4">
					<div className="flex items-center gap-2">
						<Clock className="size-6 text-[#2870BD]" />
						<span className="text-xs">The raffle will start now.</span>
					</div>
				</div>
			)}

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
