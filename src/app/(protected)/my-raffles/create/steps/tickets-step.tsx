'use client';

import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { TimePicker } from '@/components/ui/time-picker';
import {
	CircleDashed,
	Clock,
	DollarSign,
	Globe,
	InfoIcon,
	X,
} from 'lucide-react';
import { useMemo } from 'react';
import { CryptoConfigSection } from '../crypto-config-section';
import { useMultiStepForm } from '../multi-step-form-provider';
import { PromoCodesSection } from '../promo-codes-section';

export function TicketsStep() {
	const {
		form,
		nextStep,
		questions,
		pendingPromoCodes,
		clearPendingPromoCodes,
	} = useMultiStepForm();
	const {
		register,
		formState: { errors, touchedFields },
		watch,
		setValue,
		getValues,
		trigger,
	} = form;

	// Watch fields from this step only
	const startDate = watch('startDate');
	const startTime = watch('startTime');
	const endDate = watch('endDate');
	const endTime = watch('endTime');
	const pricePerTicket = watch('pricePerTicket');
	const numberOfWinners = watch('numberOfWinners');
	const minParticipants = watch('minParticipants');
	const maxParticipants = watch('maxParticipants');
	const checkInQuestion = watch('checkInQuestion');

	// Check if any field in this step is filled
	const hasFilledFields = Boolean(
		startDate ||
		startTime ||
		endDate ||
		endTime ||
		(pricePerTicket && pricePerTicket > 0) ||
		(numberOfWinners && numberOfWinners > 0) ||
		(minParticipants && minParticipants > 0) ||
		(maxParticipants && maxParticipants > 0) ||
		checkInQuestion ||
		pendingPromoCodes.length > 0,
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

	/** Whether to show partial draw info bullet */
	function shouldShowPartialDrawInfo(): boolean {
		return minParticipants > 0 && minParticipants - 1 > numberOfWinners;
	}

	/** Pluralized "participant" label */
	function formatParticipantLabel(count: number): string {
		return count !== 1 ? 'participants' : 'participant';
	}

	/**
	 * Builds a local Date from separate date (YYYY-MM-DD) and time (HH:mm) strings
	 * Falls back to midnight if time is missing
	 */
	function buildDateTime(date: string, time: string): Date {
		const [y, m, d] = date.split('-').map(Number);
		const [h, min] = (time || '00:00').split(':').map(Number);
		return new Date(y, m - 1, d, h, min);
	}

	// Check if end datetime is after start datetime
	const isDateRangeValid = useMemo(() => {
		if (!startDate || !endDate) return true;
		const start = buildDateTime(startDate, startTime);
		const end = buildDateTime(endDate, endTime);
		// Minimum 24 hours between start and end
		const MS_PER_DAY = 86_400_000;
		return end.getTime() - start.getTime() >= MS_PER_DAY;
	}, [startDate, startTime, endDate, endTime]);

	// Check if end date is within 6 months from start date
	const isEndDateWithin6Months = useMemo(() => {
		if (!startDate || !endDate) return true;
		const start = buildDateTime(startDate, startTime);
		const end = buildDateTime(endDate, endTime);
		// 6 months max — clone start and add 6 months to get the upper bound
		const maxEnd = new Date(start);
		maxEnd.setMonth(maxEnd.getMonth() + 6);
		return end <= maxEnd;
	}, [startDate, startTime, endDate, endTime]);

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

	/** Clears only this step's fields and pending promo codes */
	function handleClearAll() {
		setValue('startDate', '');
		setValue('startTime', '');
		setValue('endDate', '');
		setValue('endTime', '');
		setValue('pricePerTicket', NaN);
		setValue('numberOfWinners', NaN);
		setValue('minParticipants', 0);
		setValue('maxParticipants', 0);
		setValue('checkInQuestion', '');
		// Reset crypto config to defaults
		setValue('acceptsCrypto', false);
		setValue('cryptoChainIds', []);
		setValue('cryptoTokens', []);
		setValue('cryptoTokenPricing', []);
		clearPendingPromoCodes();
	}

	/** Validates current step fields before advancing */
	async function handleContinue() {
		const fields = [
			'startDate',
			'startTime',
			'endDate',
			'endTime',
			'pricePerTicket',
			'numberOfWinners',
			'minParticipants',
			'maxParticipants',
			'checkInQuestion',
		] as const;
		const isValid = await trigger([...fields]);

		if (!isValid) {
			for (const field of fields) {
				setValue(field, getValues(field), { shouldTouch: true });
			}
			requestAnimationFrame(() => {
				const firstError = document.querySelector('.text-red-500');
				firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
			});
			return;
		}

		nextStep();
	}

	return (
		<div className="flex w-full flex-col gap-8">
			{/* Active time period section */}
			<div className="flex flex-col gap-6 rounded-2xl bg-white p-8">
				<h2 className="text-xl font-semibold">Active time period</h2>

				<div className="grid grid-cols-2 gap-4">
					<div className="flex flex-col gap-2">
						<label htmlFor="startDate" className="font-medium">
							Start Date
						</label>
						<DatePicker
							value={startDate}
							onValueChange={value =>
								setValue('startDate', value, { shouldValidate: true })
							}
							placeholder="Select start date"
							minDate={todayDate}
						/>
						{touchedFields.startDate && errors.startDate ? (
							<span className="text-sm text-red-500">
								{errors.startDate.message}
							</span>
						) : null}
					</div>

					<div className="flex flex-col gap-2">
						<label htmlFor="startTime" className="font-medium">
							Start Time
						</label>
						<TimePicker
							value={startTime}
							onValueChange={value =>
								setValue('startTime', value, {
									shouldValidate: true,
								})
							}
							placeholder="Select start time"
						/>
						{touchedFields.startTime && errors.startTime ? (
							<span className="text-sm text-red-500">
								{errors.startTime.message}
							</span>
						) : null}
					</div>
				</div>

				<div className="grid grid-cols-2 gap-4">
					<div className="flex flex-col gap-2">
						<label htmlFor="endDate" className="font-medium">
							End Date
						</label>
						<DatePicker
							value={endDate}
							onValueChange={value =>
								setValue('endDate', value, { shouldValidate: true })
							}
							placeholder="Select end date"
							minDate={todayDate}
						/>
						{touchedFields.endDate && errors.endDate ? (
							<span className="text-sm text-red-500">
								{errors.endDate.message}
							</span>
						) : null}
						{startDate && endDate && !isDateRangeValid ? (
							<span className="text-sm text-red-500">
								End date must be at least 24 hours after start date
							</span>
						) : null}
						{startDate &&
						endDate &&
						isDateRangeValid &&
						!isEndDateWithin6Months ? (
							<span className="text-sm text-red-500">
								End date must be within 6 months of start date
							</span>
						) : null}
					</div>

					<div className="flex flex-col gap-2">
						<label htmlFor="endTime" className="font-medium">
							End Time
						</label>
						<TimePicker
							value={endTime}
							onValueChange={value =>
								setValue('endTime', value, {
									shouldValidate: true,
								})
							}
							placeholder="Select end time"
						/>
						{touchedFields.endTime && errors.endTime ? (
							<span className="text-sm text-red-500">
								{errors.endTime.message}
							</span>
						) : null}
					</div>
				</div>

				{endDate && endTime ? (
					<div className="flex items-center gap-2 text-xs text-gray-500">
						<Globe className="size-3.5 shrink-0" />
						<span>
							Times are in your local timezone (
							{Intl.DateTimeFormat().resolvedOptions().timeZone}).
							{(() => {
								// Show the UTC equivalent so hosts know the absolute time
								const utc = buildDateTime(endDate, endTime);
								const utcLabel = utc.toLocaleString('en-US', {
									timeZone: 'UTC',
									month: 'short',
									day: 'numeric',
									hour: 'numeric',
									minute: '2-digit',
								});
								return ` Ends ${utcLabel} UTC.`;
							})()}
						</span>
					</div>
				) : null}

				{!isStartDateToday ? (
					<div className="flex w-full items-center justify-between rounded-lg bg-[#E1F8FF] p-4">
						<div className="flex items-center gap-2">
							<Clock className="size-4 text-[#2870BD]" />
							<span className="text-sm">
								Raffle have a later start date. You cant change date later.
							</span>
						</div>

						<div className="flex items-center gap-2 rounded-2xl bg-[#C2E6FF] px-2 py-1">
							<CircleDashed className="size-4 stroke-[3.5] text-[#01A1FF]" />
							<span className="text-sm">Draft</span>
						</div>
					</div>
				) : null}
			</div>

			{/* Tickets section */}
			<div className="flex flex-col gap-6 rounded-2xl bg-white p-8">
				<h2 className="text-xl font-semibold">Tickets</h2>

				<div className="grid grid-cols-2 gap-4">
					<div className="flex flex-col gap-2">
						<label htmlFor="pricePerTicket" className="font-medium">
							Price per Ticket
						</label>
						<div className="relative">
							<DollarSign className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-500" />
							<Input
								id="pricePerTicket"
								step="0.01"
								min="0.5"
								placeholder="0.50"
								type="number"
								className="border-[#E5E5E5] pl-9"
								{...register('pricePerTicket', { valueAsNumber: true })}
							/>
						</div>
						{touchedFields.pricePerTicket && errors.pricePerTicket ? (
							<span className="text-sm text-red-500">
								{errors.pricePerTicket.message}
							</span>
						) : null}
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
						{touchedFields.numberOfWinners && errors.numberOfWinners ? (
							<span className="text-sm text-red-500">
								{errors.numberOfWinners.message}
							</span>
						) : null}
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
						{touchedFields.minParticipants && errors.minParticipants ? (
							<span className="text-sm text-red-500">
								{errors.minParticipants.message}
							</span>
						) : null}
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
						{touchedFields.maxParticipants && errors.maxParticipants ? (
							<span className="text-sm text-red-500">
								{errors.maxParticipants.message}
							</span>
						) : null}
					</div>
				</div>

				<div className="flex w-full items-center justify-between rounded-lg bg-[#FEFFE3] p-4">
					<div className="flex items-center gap-2">
						<InfoIcon className="size-4 text-[#B7CE00]" />
						<span className="text-sm">
							Price cannot be changed after the first ticket purchase
						</span>
					</div>
				</div>

				{numberOfWinners > 0 ? (
					<div className="flex w-full flex-col gap-2 rounded-lg bg-[#FEFFE3] p-4">
						<div className="flex items-center gap-2">
							<InfoIcon className="size-4 shrink-0 text-[#B7CE00]" />
							<span className="text-sm font-medium">
								What happens when the raffle ends?
							</span>
						</div>
						<ul className="ml-6 list-disc space-y-1 text-sm text-gray-700">
							{minParticipants > 0 ? (
								<li>
									<strong>Full draw</strong> — {minParticipants}+ participants:
									winners receive the declared prize
								</li>
							) : null}
							{shouldShowPartialDrawInfo() ? (
								<li>
									<strong>Partial draw</strong> — {numberOfWinners} to{' '}
									{minParticipants - 1} participants: winners split the revenue
									(cash distribution)
								</li>
							) : null}
							<li>
								<strong>Auto-cancel</strong> — fewer than {numberOfWinners}{' '}
								{formatParticipantLabel(numberOfWinners)}: raffle is cancelled
								and all tickets are refunded
							</li>
						</ul>
					</div>
				) : null}
			</div>

			{/* Crypto payment config */}
			<CryptoConfigSection
				acceptsCrypto={form.watch('acceptsCrypto')}
				cryptoChainIds={form.watch('cryptoChainIds')}
				cryptoTokens={form.watch('cryptoTokens')}
				cryptoTokenPricing={form.watch('cryptoTokenPricing')}
				onFieldChange={(field, value) =>
					form.setValue(field, value, { shouldDirty: true })
				}
			/>

			{/* Promo codes section */}
			<PromoCodesSection />

			{/* Participant Check-in Question section */}
			<div className="flex flex-col gap-6 rounded-2xl bg-white p-8">
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
						onValueChange={value =>
							setValue('checkInQuestion', value, { shouldValidate: true })
						}
						placeholder="Select question"
						searchPlaceholder="Search question..."
						emptyText="No question found."
						className="max-w-md"
					/>
					{touchedFields.checkInQuestion && errors.checkInQuestion ? (
						<span className="text-sm text-red-500">
							{errors.checkInQuestion.message}
						</span>
					) : null}
				</div>

				{selectedQuestion ? (
					<div className="flex flex-col gap-2">
						{selectedQuestion.options
							.toSorted((a, b) => a.sortOrder - b.sortOrder)
							.map(option => (
								<div key={option.id}>
									<span className="text-sm text-gray-500">{option.text}</span>
								</div>
							))}
					</div>
				) : null}
			</div>

			{/* Continue/Clear buttons */}
			<div className="flex items-center gap-2">
				<Button
					type="button"
					onClick={handleContinue}
					className="cursor-pointer px-6"
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
