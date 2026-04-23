'use client';

import { CircleDashed, Clock, Lock } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Path, PathValue } from 'react-hook-form';

import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip';

import { TimezoneNotice } from './timezone-notice';
import type {
	TicketsFormValues,
	TicketsStepErrors,
	TicketsStepForm,
	TicketsStepTouched,
	TimePeriodRestrictions,
} from './types';

interface TimePeriodFieldsetProps<TValues extends TicketsFormValues> {
	form: TicketsStepForm<TValues>;
	todayDate: Date;
	isDateRangeValid: boolean;
	isEndDateWithin6Months: boolean;
	isStartDateToday: boolean;
	/** Whitespace padding around the outer card (create uses `p-8`, edit uses `p-6`). */
	cardPadding: 'p-6' | 'p-8';
	/** Optional lock flags — defaults to fully-unlocked (create-mode semantics). */
	restrictions?: TimePeriodRestrictions;
	/**
	 * Optional extra banner rendered inside the card (e.g. edit-mode "live"
	 * banner). The shared draft-start banner is mutually exclusive with
	 * this slot — the composer is responsible for passing one or the other.
	 */
	lockBanner?: ReactNode;
}

// Field names typed against the narrow shared surface; callers whose
// concrete schema extends it (create + edit) satisfy the constraint.
const START_DATE = 'startDate';
const START_TIME = 'startTime';
const END_DATE = 'endDate';
const END_TIME = 'endTime';

/**
 * Start + end date/time picker group used by both the create and edit
 * Tickets steps. The `restrictions` prop defaults to fully-unlocked so the
 * create flow never sees locked inputs — edit passes `startLocked` for live
 * raffles where the start window is frozen.
 *
 * @returns Two-column date/time picker grid with timezone notice + draft banner.
 */
export function TimePeriodFieldset<TValues extends TicketsFormValues>({
	form,
	todayDate,
	isDateRangeValid,
	isEndDateWithin6Months,
	isStartDateToday,
	cardPadding,
	restrictions,
	lockBanner,
}: TimePeriodFieldsetProps<TValues>) {
	const { watch, setValue, formState } = form;
	// Cast once at the boundary — see `TicketsStepErrors` / `TicketsStepTouched`
	// for the rationale (deep recursive types resist generic indexing).
	const errors = formState.errors as TicketsStepErrors;
	const touchedFields = formState.touchedFields as TicketsStepTouched;
	const startLocked = Boolean(restrictions?.startLocked);
	const endLocked = Boolean(restrictions?.endLocked);
	const startDate = watch(START_DATE as Path<TValues>) as string;
	const startTime = watch(START_TIME as Path<TValues>) as string;
	const endDate = watch(END_DATE as Path<TValues>) as string;
	const endTime = watch(END_TIME as Path<TValues>) as string;

	// Named writer — react-hook-form's `setValue` is invariant in TValues so
	// we cast the field path once and the value cast is just the union narrow.
	function writeString(field: Path<TValues>, value: string) {
		setValue(field, value as PathValue<TValues, Path<TValues>>, {
			shouldValidate: true,
		});
	}

	// Banner visibility is mutually exclusive: edit-specific "Live" banner is
	// not rendered here (see `tickets-lock-banners.tsx`); the "Draft" banner
	// shows whenever the start date is NOT today and the start is unlocked.
	const showDraftBanner = !startLocked && !isStartDateToday;

	return (
		<div className={`flex flex-col gap-6 rounded-2xl bg-white ${cardPadding}`}>
			<h2 className="text-xl font-semibold">Active time period</h2>

			<div className="grid grid-cols-2 gap-4">
				<StartDateField
					value={startDate}
					onValueChange={v => writeString(START_DATE as Path<TValues>, v)}
					minDate={todayDate}
					disabled={startLocked}
					touched={Boolean(touchedFields[START_DATE])}
					errorMessage={errors[START_DATE]?.message ?? null}
					locked={startLocked}
				/>
				<StartTimeField
					value={startTime}
					onValueChange={v => writeString(START_TIME as Path<TValues>, v)}
					disabled={startLocked}
					touched={Boolean(touchedFields[START_TIME])}
					errorMessage={errors[START_TIME]?.message ?? null}
				/>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<EndDateField
					value={endDate}
					onValueChange={v => writeString(END_DATE as Path<TValues>, v)}
					minDate={todayDate}
					disabled={endLocked}
					touched={Boolean(touchedFields[END_DATE])}
					errorMessage={errors[END_DATE]?.message ?? null}
					startDate={startDate}
					endDate={endDate}
					isDateRangeValid={isDateRangeValid}
					isEndDateWithin6Months={isEndDateWithin6Months}
				/>
				<EndTimeField
					value={endTime}
					onValueChange={v => writeString(END_TIME as Path<TValues>, v)}
					disabled={endLocked}
					touched={Boolean(touchedFields[END_TIME])}
					errorMessage={errors[END_TIME]?.message ?? null}
				/>
			</div>

			{endDate && endTime ? (
				<TimezoneNotice endDate={endDate} endTime={endTime} />
			) : null}

			{lockBanner}
			{showDraftBanner ? <DraftStartDateBanner /> : null}
		</div>
	);
}

interface StartDateFieldProps {
	value: string;
	onValueChange: (value: string) => void;
	minDate: Date;
	disabled: boolean;
	touched: boolean;
	errorMessage: string | null;
	locked: boolean;
}

/** Start-date column — label + optional lock icon + DatePicker + error row. */
function StartDateField({
	value,
	onValueChange,
	minDate,
	disabled,
	touched,
	errorMessage,
	locked,
}: StartDateFieldProps) {
	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center gap-2">
				<label htmlFor="startDate" className="font-medium">
					Start Date
				</label>
				{locked ? <StartDateLockedTooltip /> : null}
			</div>
			<DatePicker
				value={value}
				onValueChange={onValueChange}
				placeholder="Select start date"
				minDate={minDate}
				disabled={disabled}
			/>
			{touched && errorMessage ? (
				<span className="text-sm text-red-500">{errorMessage}</span>
			) : null}
		</div>
	);
}

/** Renders the "start date frozen" tooltip next to the start-date label. */
function StartDateLockedTooltip() {
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Lock className="text-muted-foreground size-4" aria-hidden="true" />
				</TooltipTrigger>
				<TooltipContent>
					<p>Start date cannot be changed for live sweepstakes</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

interface StartTimeFieldProps {
	value: string;
	onValueChange: (value: string) => void;
	disabled: boolean;
	touched: boolean;
	errorMessage: string | null;
}

/** Start-time column. */
function StartTimeField({
	value,
	onValueChange,
	disabled,
	touched,
	errorMessage,
}: StartTimeFieldProps) {
	return (
		<div className="flex flex-col gap-2">
			<label htmlFor="startTime" className="font-medium">
				Start Time
			</label>
			<TimePicker
				value={value}
				onValueChange={onValueChange}
				placeholder="Select start time"
				disabled={disabled}
			/>
			{touched && errorMessage ? (
				<span className="text-sm text-red-500">{errorMessage}</span>
			) : null}
		</div>
	);
}

interface EndDateFieldProps {
	value: string;
	onValueChange: (value: string) => void;
	minDate: Date;
	disabled: boolean;
	touched: boolean;
	errorMessage: string | null;
	startDate: string;
	endDate: string;
	isDateRangeValid: boolean;
	isEndDateWithin6Months: boolean;
}

/** End-date column — includes the two derived range-validity messages. */
function EndDateField({
	value,
	onValueChange,
	minDate,
	disabled,
	touched,
	errorMessage,
	startDate,
	endDate,
	isDateRangeValid,
	isEndDateWithin6Months,
}: EndDateFieldProps) {
	// Extract to named variables so the JSX only branches on booleans —
	// keeps the component under the 3-nesting-level limit.
	const rangeMessage = resolveEndDateExtraMessage({
		startDate,
		endDate,
		isDateRangeValid,
		isEndDateWithin6Months,
	});
	return (
		<div className="flex flex-col gap-2">
			<label htmlFor="endDate" className="font-medium">
				End Date
			</label>
			<DatePicker
				value={value}
				onValueChange={onValueChange}
				placeholder="Select end date"
				minDate={minDate}
				disabled={disabled}
			/>
			{touched && errorMessage ? (
				<span className="text-sm text-red-500">{errorMessage}</span>
			) : null}
			{rangeMessage !== null ? (
				<span className="text-sm text-red-500">{rangeMessage}</span>
			) : null}
		</div>
	);
}

interface ResolveExtraMessageInput {
	startDate: string;
	endDate: string;
	isDateRangeValid: boolean;
	isEndDateWithin6Months: boolean;
}

/**
 * Picks between the two derived range error messages (or `null` when
 * neither applies). Extracted to replace a chain of JSX ternaries.
 */
function resolveEndDateExtraMessage({
	startDate,
	endDate,
	isDateRangeValid,
	isEndDateWithin6Months,
}: ResolveExtraMessageInput): string | null {
	if (!startDate || !endDate) return null;
	if (!isDateRangeValid) {
		return 'End date must be at least 24 hours after start date';
	}
	if (!isEndDateWithin6Months) {
		return 'End date must be within 6 months of start date';
	}
	return null;
}

interface EndTimeFieldProps {
	value: string;
	onValueChange: (value: string) => void;
	disabled: boolean;
	touched: boolean;
	errorMessage: string | null;
}

/** End-time column. */
function EndTimeField({
	value,
	onValueChange,
	disabled,
	touched,
	errorMessage,
}: EndTimeFieldProps) {
	return (
		<div className="flex flex-col gap-2">
			<label htmlFor="endTime" className="font-medium">
				End Time
			</label>
			<TimePicker
				value={value}
				onValueChange={onValueChange}
				placeholder="Select end time"
				disabled={disabled}
			/>
			{touched && errorMessage ? (
				<span className="text-sm text-red-500">{errorMessage}</span>
			) : null}
		</div>
	);
}

/** Soft-blue "Draft — later start date" banner shown when start date is set but isn't today. */
function DraftStartDateBanner() {
	return (
		<div className="flex w-full items-center justify-between rounded-lg bg-sky-100 p-4">
			<div className="flex items-center gap-2">
				<Clock className="text-brand-blue size-4" aria-hidden="true" />
				<span className="text-sm">
					Sweepstakes has a later start date. You can&apos;t change the date
					later.
				</span>
			</div>
			<div className="flex items-center gap-2 rounded-2xl bg-sky-200 px-2 py-1">
				<CircleDashed
					className="stroke-3-5 size-4 text-sky-400"
					aria-hidden="true"
				/>
				<span className="text-sm">Draft</span>
			</div>
		</div>
	);
}
