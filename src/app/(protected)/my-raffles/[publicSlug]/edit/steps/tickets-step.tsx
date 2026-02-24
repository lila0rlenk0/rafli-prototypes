'use client';

import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip';
import {
	CircleDashed,
	Clock,
	DollarSign,
	InfoIcon,
	Lock,
	X,
} from 'lucide-react';
import { useMemo } from 'react';
import { useEditForm } from '../edit-form-provider';
import { PromoCodesSection } from '../promo-codes-section';

/**
 * TicketsStep for Edit Form
 *
 * Displays time period and ticket fields: start/end dates, ticket price, winners, participants.
 * Applies field restrictions based on raffle state:
 * - startDateLocked: if start date is in the future (scheduled)
 * - priceLocked: if any tickets have been sold
 */
export function TicketsStep() {
	const { form, nextStep, restrictions, questions } = useEditForm();
	const {
		register,
		formState: { errors, touchedFields },
		watch,
		setValue,
		trigger,
	} = form;

	// Watch fields from this step only
	const startDate = watch('startDate');
	const endDate = watch('endDate');
	const pricePerTicket = watch('pricePerTicket');
	const numberOfWinners = watch('numberOfWinners');
	const minParticipants = watch('minParticipants');
	const maxParticipants = watch('maxParticipants');
	const checkInQuestion = watch('checkInQuestion');

	// Check if any field in this step is filled
	const hasFilledFields = Boolean(
		startDate ||
		endDate ||
		(pricePerTicket && pricePerTicket > 0) ||
		(numberOfWinners && numberOfWinners > 0) ||
		(minParticipants && minParticipants > 0) ||
		(maxParticipants && maxParticipants > 0) ||
		checkInQuestion,
	);

	// Find the selected question to show options preview
	const selectedQuestion = useMemo(() => {
		if (!checkInQuestion) return null;
		return questions.find(q => q.id === checkInQuestion) || null;
	}, [checkInQuestion, questions]);

	/**
	 * Checks if the start date is today
	 * Normalizes both dates to local midnight to avoid timezone issues
	 * @param dateString - The start date string (format: YYYY-MM-DD)
	 * @returns true if start date is today, false otherwise
	 */
	function checkIfStartDateIsToday(dateString: string): boolean {
		if (!dateString) return false;

		// Parse the date string and normalize to local midnight
		const [year, month, day] = dateString.split('-').map(Number);
		const start = new Date(year, month - 1, day);

		// Get today's date normalized to local midnight
		const today = new Date();
		const todayNormalized = new Date(
			today.getFullYear(),
			today.getMonth(),
			today.getDate(),
		);

		// Compare year, month, and day only (both normalized to local midnight)
		return (
			start.getFullYear() === todayNormalized.getFullYear() &&
			start.getMonth() === todayNormalized.getMonth() &&
			start.getDate() === todayNormalized.getDate()
		);
	}

	// Check if end date is after start date
	const isDateRangeValid = useMemo(() => {
		if (!startDate || !endDate) return true; // Don't validate if dates are not set
		const start = new Date(startDate);
		const end = new Date(endDate);
		return end > start;
	}, [startDate, endDate]);

	// Check if there's at least 30 days between start and end
	// TODO: Temporary rule - remove when no longer needed
	const hasMinimum30DaysGap = useMemo(() => {
		if (!startDate || !endDate) return true; // Don't validate if dates are not set
		const start = new Date(startDate);
		const end = new Date(endDate);
		const diffTime = end.getTime() - start.getTime();
		const diffDays = diffTime / (1000 * 60 * 60 * 24);
		return diffDays >= 30;
	}, [startDate, endDate]);

	// Check if start date is today
	const isStartDateToday = checkIfStartDateIsToday(startDate);

	/**
	 * Gets today's date normalized to local midnight
	 * Used to disable past dates in the calendar
	 * @returns Date object representing today at midnight
	 */
	function getTodayDate(): Date {
		const today = new Date();
		return new Date(today.getFullYear(), today.getMonth(), today.getDate());
	}

	const todayDate = getTodayDate();

	// Check if all fields in this step are filled and valid
	// Note: maxParticipants=0 means unlimited, so we allow it as valid
	const isCurrentStepValid =
		Boolean(startDate) &&
		Boolean(endDate) &&
		Boolean(pricePerTicket && pricePerTicket >= 0.5) &&
		Boolean(numberOfWinners && numberOfWinners > 0) &&
		Boolean(minParticipants && minParticipants > 0) &&
		typeof maxParticipants === 'number' &&
		maxParticipants >= 0 &&
		Boolean(checkInQuestion) &&
		isDateRangeValid &&
		hasMinimum30DaysGap &&
		!errors.startDate &&
		!errors.endDate &&
		!errors.pricePerTicket &&
		!errors.numberOfWinners &&
		!errors.minParticipants &&
		!errors.maxParticipants &&
		!errors.checkInQuestion;

	// Clear only this step's fields (respecting restrictions)
	function handleClearAll() {
		if (!restrictions.startDateLocked) {
			setValue('startDate', '');
		}
		setValue('endDate', '');
		if (!restrictions.priceLocked) {
			setValue('pricePerTicket', NaN);
		}
		setValue('numberOfWinners', NaN);
		setValue('minParticipants', 0);
		setValue('maxParticipants', 0);
		setValue('checkInQuestion', '');
	}

	// Handle continue with validation
	async function handleContinue() {
		// Trigger validation for current step fields
		const isValid = await trigger([
			'startDate',
			'endDate',
			'pricePerTicket',
			'numberOfWinners',
			'minParticipants',
			'maxParticipants',
			'checkInQuestion',
		]);

		if (isValid) {
			nextStep();
		}
	}

	return (
		<div className="flex w-full flex-col gap-6">
			{/* Active time period section */}
			<div className="flex flex-col gap-6 rounded-2xl bg-white p-6">
				<h2 className="text-xl font-semibold">Active time period</h2>

				<div className="grid grid-cols-2 gap-4">
					<div className="flex flex-col gap-2">
						<div className="flex items-center gap-2">
							<label htmlFor="startDate" className="font-medium">
								Start Date
							</label>
							{restrictions.startDateLocked && (
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<Lock className="size-4 text-gray-400" />
										</TooltipTrigger>
										<TooltipContent>
											<p>Start date cannot be changed for live raffles</p>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							)}
						</div>
						<DatePicker
							value={startDate}
							onValueChange={value => setValue('startDate', value)}
							placeholder="Select start date"
							minDate={todayDate}
							disabled={restrictions.startDateLocked}
						/>
						{touchedFields.startDate && errors.startDate && (
							<span className="text-sm text-red-500">
								{errors.startDate.message}
							</span>
						)}
					</div>

					<div className="flex flex-col gap-2">
						<label htmlFor="endDate" className="font-medium">
							End Date
						</label>
						<DatePicker
							value={endDate}
							onValueChange={value => setValue('endDate', value)}
							placeholder="Select end date"
							minDate={todayDate}
						/>
						{touchedFields.endDate && errors.endDate && (
							<span className="text-sm text-red-500">
								{errors.endDate.message}
							</span>
						)}
						{startDate && endDate && !isDateRangeValid && (
							<span className="text-sm text-red-500">
								End date must be after start date
							</span>
						)}
						{startDate &&
							endDate &&
							isDateRangeValid &&
							!hasMinimum30DaysGap && (
								<span className="text-sm text-red-500">
									There must be at least 30 days between start and end date
								</span>
							)}
					</div>
				</div>

				{restrictions.startDateLocked && (
					<div className="flex w-full items-center justify-between rounded-lg bg-[#E1F8FF] p-4">
						<div className="flex items-center gap-2">
							<Clock className="size-6 text-[#2870BD]" />
							<span className="text-xs">
								Raffle is live. Start date cannot be changed.
							</span>
						</div>

						<div className="flex items-center gap-2 rounded-2xl bg-[#C2E6FF] px-2 py-1">
							<CircleDashed className="size-4 stroke-[3.5] text-[#01A1FF]" />
							<span className="text-sm">Live</span>
						</div>
					</div>
				)}

				{!restrictions.startDateLocked && !isStartDateToday && (
					<div className="flex w-full items-center justify-between rounded-lg bg-[#E1F8FF] p-4">
						<div className="flex items-center gap-2">
							<Clock className="size-6 text-[#2870BD]" />
							<span className="text-xs">
								Raffle has a later start date. You can&apos;t change the date
								later.
							</span>
						</div>

						<div className="flex items-center gap-2 rounded-2xl bg-[#C2E6FF] px-2 py-1">
							<CircleDashed className="size-4 stroke-[3.5] text-[#01A1FF]" />
							<span className="text-sm">Draft</span>
						</div>
					</div>
				)}
			</div>

			{/* Tickets section */}
			<div className="flex flex-col gap-6 rounded-2xl bg-white p-6">
				<h2 className="text-xl font-semibold">Tickets</h2>

				<div className="grid grid-cols-2 gap-4">
					<div className="flex flex-col gap-2">
						<div className="flex items-center gap-2">
							<label htmlFor="pricePerTicket" className="font-medium">
								Price per Ticket
							</label>
							{restrictions.priceLocked && (
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<Lock className="size-4 text-gray-400" />
										</TooltipTrigger>
										<TooltipContent>
											<p>Price cannot be changed after ticket sales</p>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							)}
						</div>
						<div className="relative">
							<DollarSign className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-500" />
							<Input
								id="pricePerTicket"
								step="0.01"
								min="0.5"
								placeholder="0.50"
								type="number"
								className="border-[#E5E5E5] pl-9"
								disabled={restrictions.priceLocked}
								{...register('pricePerTicket', { valueAsNumber: true })}
							/>
						</div>
						{touchedFields.pricePerTicket && errors.pricePerTicket && (
							<span className="text-sm text-red-500">
								{errors.pricePerTicket.message}
							</span>
						)}
					</div>

					<div className="flex flex-col gap-2">
						<label htmlFor="numberOfWinners" className="font-medium">
							Number of Winners
						</label>
						<Input
							id="numberOfWinners"
							type="number"
							className="border-[#E5E5E5]"
							placeholder="0"
							{...register('numberOfWinners', { valueAsNumber: true })}
						/>
						{touchedFields.numberOfWinners && errors.numberOfWinners && (
							<span className="text-sm text-red-500">
								{errors.numberOfWinners.message}
							</span>
						)}
					</div>
				</div>

				<div className="grid grid-cols-2 gap-4">
					<div className="flex flex-col gap-2">
						<label htmlFor="minParticipants" className="font-medium">
							Min Participants
						</label>
						<Input
							id="minParticipants"
							type="number"
							className="border-[#E5E5E5]"
							placeholder="0"
							{...register('minParticipants', { valueAsNumber: true })}
						/>
						<span className="text-xs text-gray-500">
							Set to 0 to disable. Must exceed number of winners when enabled.
						</span>
						{touchedFields.minParticipants && errors.minParticipants && (
							<span className="text-sm text-red-500">
								{errors.minParticipants.message}
							</span>
						)}
					</div>

					<div className="flex flex-col gap-2">
						<label htmlFor="maxParticipants" className="font-medium">
							Max Participants
						</label>
						<Input
							id="maxParticipants"
							type="number"
							className="border-[#E5E5E5]"
							placeholder="0"
							{...register('maxParticipants', { valueAsNumber: true })}
						/>
						<span className="text-xs text-gray-500">
							Set to 0 for unlimited participants
						</span>
						{touchedFields.maxParticipants && errors.maxParticipants && (
							<span className="text-sm text-red-500">
								{errors.maxParticipants.message}
							</span>
						)}
					</div>
				</div>

				{restrictions.priceLocked ? (
					<div className="flex w-full items-center justify-between rounded-lg bg-[#FFF3E3] p-4">
						<div className="flex items-center gap-2">
							<Lock className="size-6 text-[#F59E0B]" />
							<span className="text-xs">
								Price is locked because tickets have been sold
							</span>
						</div>
					</div>
				) : (
					<div className="flex w-full items-center justify-between rounded-lg bg-[#FEFFE3] p-4">
						<div className="flex items-center gap-2">
							<InfoIcon className="size-6 text-[#B7CE00]" />
							<span className="text-xs">
								Price cannot be changed after the first ticket purchase
							</span>
						</div>
					</div>
				)}
			</div>

			{/* Promo codes section */}
			<PromoCodesSection />

			{/* Participant Check-in Question section */}
			<div className="flex flex-col gap-6 rounded-2xl bg-white p-6">
				<div className="flex flex-col gap-2">
					<h2 className="text-xl font-semibold">
						Participant Check-in Question
					</h2>
					<p className="text-sm text-gray-600">
						Choose a simple question participants will answer before joining
						your raffle. This helps confirm real participation and keeps entries
						fair.
					</p>
				</div>

				<div className="flex flex-col gap-2">
					<label htmlFor="checkInQuestion" className="font-medium">
						Question
					</label>
					<Combobox
						options={questions.map(q => ({
							value: q.id,
							label: q.text,
						}))}
						value={checkInQuestion}
						onValueChange={value => setValue('checkInQuestion', value)}
						placeholder="Select question"
						searchPlaceholder="Search question..."
						emptyText="No question found."
						className="max-w-md"
					/>
					{touchedFields.checkInQuestion && errors.checkInQuestion && (
						<span className="text-sm text-red-500">
							{errors.checkInQuestion.message}
						</span>
					)}
				</div>

				{selectedQuestion && (
					<div className="flex flex-col gap-2">
						{selectedQuestion.options
							.sort((a, b) => a.sortOrder - b.sortOrder)
							.map(option => (
								<div key={option.id}>
									<span className="text-sm text-gray-500">{option.text}</span>
								</div>
							))}
					</div>
				)}
			</div>

			{/* Continue/Clear buttons */}
			<div className="flex items-center gap-2">
				<Button
					type="button"
					onClick={handleContinue}
					disabled={!isCurrentStepValid}
					className="cursor-pointer disabled:cursor-not-allowed disabled:bg-black disabled:opacity-70"
				>
					Continue
				</Button>

				<Button
					variant="ghost"
					type="button"
					onClick={handleClearAll}
					disabled={!hasFilledFields}
					className="flex cursor-pointer items-center gap-2"
				>
					<X className="size-4" />
					<span className="text-sm font-semibold">Clear all</span>
				</Button>
			</div>
		</div>
	);
}
