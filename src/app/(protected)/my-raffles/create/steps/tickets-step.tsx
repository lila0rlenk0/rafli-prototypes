'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { CircleDashed, Clock, InfoIcon, X } from 'lucide-react';
import { useMultiStepForm } from '../multi-step-form-provider';

export function TicketsStep() {
	const { form, nextStep } = useMultiStepForm();
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

	// Check if any field in this step is filled
	const hasFilledFields = Boolean(
		startDate ||
		endDate ||
		(pricePerTicket && pricePerTicket > 0) ||
		(numberOfWinners && numberOfWinners > 0) ||
		(minParticipants && minParticipants > 0) ||
		(maxParticipants && maxParticipants > 0),
	);

	// Check if end date is after start date
	const isDateRangeValid = useMemo(() => {
		if (!startDate || !endDate) return true; // Don't validate if dates are not set
		const start = new Date(startDate);
		const end = new Date(endDate);
		return end > start;
	}, [startDate, endDate]);

	// Check if all fields in this step are filled and valid
	const isCurrentStepValid =
		Boolean(startDate) &&
		Boolean(endDate) &&
		Boolean(pricePerTicket && pricePerTicket > 0) &&
		Boolean(numberOfWinners && numberOfWinners > 0) &&
		Boolean(minParticipants && minParticipants > 0) &&
		Boolean(maxParticipants && maxParticipants > 0) &&
		isDateRangeValid &&
		!errors.startDate &&
		!errors.endDate &&
		!errors.pricePerTicket &&
		!errors.numberOfWinners &&
		!errors.minParticipants &&
		!errors.maxParticipants;

	// Clear only this step's fields
	const handleClearAll = () => {
		setValue('startDate', '');
		setValue('endDate', '');
		setValue('pricePerTicket', 0);
		setValue('numberOfWinners', 0);
		setValue('minParticipants', 0);
		setValue('maxParticipants', 0);
	};

	// Handle continue with validation
	const handleContinue = async () => {
		// Trigger validation for current step fields
		const isValid = await trigger([
			'startDate',
			'endDate',
			'pricePerTicket',
			'numberOfWinners',
			'minParticipants',
			'maxParticipants',
		]);

		if (isValid) {
			nextStep();
		}
	};

	return (
		<div className="flex w-full flex-col gap-6">
			{/* Active time period section */}
			<div className="flex flex-col gap-6 rounded-2xl bg-white p-6">
				<h2 className="text-xl font-semibold">Active time period</h2>

				<div className="grid grid-cols-2 gap-4">
					<div className="flex flex-col gap-2">
						<label htmlFor="startDate" className="font-medium">
							Start Date
						</label>
						<DatePicker
							value={startDate}
							onValueChange={value => setValue('startDate', value)}
							placeholder="Select start date"
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
					</div>
				</div>

				<div className="flex w-full items-center justify-between rounded-lg bg-[#E1F8FF] p-4">
					<div className="flex items-center gap-2">
						<Clock className="size-6 text-[#2870BD]" />
						<span className="text-xs">
							Raffle have a later start date. You cant change date later.
						</span>
					</div>

					<div className="flex items-center gap-2 rounded-2xl bg-[#C2E6FF] px-2 py-1">
						<CircleDashed className="size-4 stroke-[3.5] text-[#01A1FF]" />
						<span className="text-sm">Draft</span>
					</div>
				</div>
			</div>

			{/* Tickets section */}
			<div className="flex flex-col gap-6 rounded-2xl bg-white p-6">
				<h2 className="text-xl font-semibold">Tickets</h2>

				<div className="grid grid-cols-2 gap-4">
					<div className="flex flex-col gap-2">
						<label htmlFor="pricePerTicket" className="font-medium">
							Price per Ticket
						</label>
						<Input
							id="pricePerTicket"
							type="number"
							step="0.01"
							className="border-[#E5E5E5]"
							placeholder="0.00"
							{...register('pricePerTicket', { valueAsNumber: true })}
						/>
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
						{touchedFields.maxParticipants && errors.maxParticipants && (
							<span className="text-sm text-red-500">
								{errors.maxParticipants.message}
							</span>
						)}
					</div>
				</div>

				<div className="flex w-full items-center justify-between rounded-lg bg-[#FEFFE3] p-4">
					<div className="flex items-center gap-2">
						<InfoIcon className="size-6 text-[#B7CE00]" />
						<span className="text-xs">
							Price cannot be changed after the first ticket purchase
						</span>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<Button
						type="button"
						onClick={handleContinue}
						disabled={!isCurrentStepValid}
						className="cursor-pointer disabled:bg-black disabled:opacity-100"
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
		</div>
	);
}
