'use client';

import { DollarSign, InfoIcon, Lock } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Path, UseFormRegisterReturn } from 'react-hook-form';

import { Input } from '@/components/ui/input';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip';

import {
	formatParticipantLabel,
	shouldShowPartialDrawCallout,
} from './ticket-format';
import type {
	EntriesRestrictions,
	TicketsFormValues,
	TicketsStepErrors,
	TicketsStepForm,
	TicketsStepTouched,
} from './types';

interface EntriesFieldsetProps<TValues extends TicketsFormValues> {
	form: TicketsStepForm<TValues>;
	/** Card padding — create uses `p-8`, edit uses `p-6`. */
	cardPadding: 'p-6' | 'p-8';
	/** Optional lock flags — defaults to fully-unlocked (create-mode semantics). */
	restrictions?: EntriesRestrictions;
	/**
	 * Replaces the default "Price cannot be changed after first entry"
	 * banner when price is locked (edit flow passes the "price frozen —
	 * entries have been sold" banner here).
	 */
	priceLockedBanner?: ReactNode;
}

const PRICE = 'pricePerTicket';
const WINNERS = 'numberOfWinners';
const MIN_PARTICIPANTS = 'minParticipants';
const MAX_PARTICIPANTS = 'maxParticipants';

/**
 * Entries fieldset — price + winners + min/max participants inputs, the
 * static "price cannot change after first entry" info banner, and the
 * outcome breakdown list that only renders once `numberOfWinners > 0`.
 *
 * `restrictions` defaults to fully-unlocked so the create wizard never
 * sees locked inputs. The edit wizard passes `priceLocked: true` when
 * entries have already been sold; the corresponding "price is locked"
 * warning banner lives in `tickets-lock-banners.tsx` and is rendered
 * alongside this fieldset by the composer.
 *
 * @returns Entries fieldset JSX.
 */
export function EntriesFieldset<TValues extends TicketsFormValues>({
	form,
	cardPadding,
	restrictions,
	priceLockedBanner,
}: EntriesFieldsetProps<TValues>) {
	const { register, watch, formState } = form;
	// Flatten the recursive RHF types to a simple field-name lookup.
	const errors = formState.errors as TicketsStepErrors;
	const touchedFields = formState.touchedFields as TicketsStepTouched;
	const priceLocked = Boolean(restrictions?.priceLocked);
	const winnersLocked = Boolean(restrictions?.winnersLocked);

	// Watches — coerced to number because the input is `valueAsNumber: true`
	// and `react-hook-form` preserves that once registered. Fallback to 0
	// keeps downstream derived logic straightforward on a partially-filled form.
	const numberOfWinners =
		(watch(WINNERS as Path<TValues>) as number | undefined) ?? 0;
	const minParticipants =
		(watch(MIN_PARTICIPANTS as Path<TValues>) as number | undefined) ?? 0;

	return (
		<div className={`flex flex-col gap-6 rounded-2xl bg-white ${cardPadding}`}>
			<h2 className="text-xl font-semibold">Entries</h2>

			<div className="grid grid-cols-2 gap-4">
				<PriceField
					register={register(PRICE as Path<TValues>, { valueAsNumber: true })}
					disabled={priceLocked}
					locked={priceLocked}
					touched={Boolean(touchedFields[PRICE])}
					errorMessage={errors[PRICE]?.message ?? null}
				/>
				<WinnersField
					register={register(WINNERS as Path<TValues>, { valueAsNumber: true })}
					disabled={winnersLocked}
					touched={Boolean(touchedFields[WINNERS])}
					errorMessage={errors[WINNERS]?.message ?? null}
				/>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<ParticipantBoundField
					id="minParticipants"
					label="Min Participants"
					register={register(MIN_PARTICIPANTS as Path<TValues>, {
						valueAsNumber: true,
					})}
					description="Set to 0 to disable. Must exceed number of winners when enabled."
					touched={Boolean(touchedFields[MIN_PARTICIPANTS])}
					errorMessage={errors[MIN_PARTICIPANTS]?.message ?? null}
				/>
				<ParticipantBoundField
					id="maxParticipants"
					label="Max Participants"
					register={register(MAX_PARTICIPANTS as Path<TValues>, {
						valueAsNumber: true,
					})}
					description="Set to 0 for unlimited participants"
					touched={Boolean(touchedFields[MAX_PARTICIPANTS])}
					errorMessage={errors[MAX_PARTICIPANTS]?.message ?? null}
				/>
			</div>

			{priceLocked ? priceLockedBanner : <PriceImmutableInfoBanner />}

			{numberOfWinners > 0 ? (
				<OutcomeBreakdown
					numberOfWinners={numberOfWinners}
					minParticipants={minParticipants}
				/>
			) : null}
		</div>
	);
}

// ReturnType of `register(...)` — spreading it onto an Input keeps the
// field's `onChange`, `onBlur`, `name`, and `ref` wired without leaking
// the full form generic into the leaf components.
type RegisterReturn = UseFormRegisterReturn<string>;

interface PriceFieldProps {
	register: RegisterReturn;
	disabled: boolean;
	locked: boolean;
	touched: boolean;
	errorMessage: string | null;
}

/** Price-per-entry column — DollarSign prefix, optional lock tooltip. */
function PriceField({
	register,
	disabled,
	locked,
	touched,
	errorMessage,
}: PriceFieldProps) {
	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center gap-2">
				<label htmlFor="pricePerTicket" className="font-medium">
					Price per Entry
				</label>
				{locked ? <PriceLockedTooltip /> : null}
			</div>
			<div className="relative">
				<DollarSign
					className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
					aria-hidden="true"
				/>
				<Input
					id="pricePerTicket"
					step="0.01"
					min="0.5"
					placeholder="0.50"
					type="number"
					className="border-ink-200 pl-9"
					disabled={disabled}
					{...register}
				/>
			</div>
			{touched && errorMessage ? (
				<span className="text-sm text-red-500">{errorMessage}</span>
			) : null}
		</div>
	);
}

/** Renders the "price frozen after first sale" tooltip next to the Price label. */
function PriceLockedTooltip() {
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Lock className="text-muted-foreground size-4" aria-hidden="true" />
				</TooltipTrigger>
				<TooltipContent>
					<p>Price cannot be changed after entry sales</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

interface WinnersFieldProps {
	register: RegisterReturn;
	disabled: boolean;
	touched: boolean;
	errorMessage: string | null;
}

/** Number-of-winners column. */
function WinnersField({
	register,
	disabled,
	touched,
	errorMessage,
}: WinnersFieldProps) {
	return (
		<div className="flex flex-col gap-2">
			<label htmlFor="numberOfWinners" className="font-medium">
				Number of Winners
			</label>
			<Input
				id="numberOfWinners"
				type="number"
				className="border-ink-200"
				placeholder="0"
				disabled={disabled}
				{...register}
			/>
			{touched && errorMessage ? (
				<span className="text-sm text-red-500">{errorMessage}</span>
			) : null}
		</div>
	);
}

interface ParticipantBoundFieldProps {
	id: 'minParticipants' | 'maxParticipants';
	label: string;
	register: RegisterReturn;
	description: string;
	touched: boolean;
	errorMessage: string | null;
}

/** Min or max participants column — same shape for both bounds. */
function ParticipantBoundField({
	id,
	label,
	register,
	description,
	touched,
	errorMessage,
}: ParticipantBoundFieldProps) {
	return (
		<div className="flex flex-col gap-2">
			<label htmlFor={id} className="font-medium">
				{label}
			</label>
			<Input
				id={id}
				type="number"
				className="border-ink-200"
				placeholder="0"
				{...register}
			/>
			<span className="text-muted-foreground text-xs">{description}</span>
			{touched && errorMessage ? (
				<span className="text-sm text-red-500">{errorMessage}</span>
			) : null}
		</div>
	);
}

/** Info banner always shown when price isn't locked. */
function PriceImmutableInfoBanner() {
	return (
		<div className="flex w-full items-center justify-between rounded-lg bg-yellow-100 p-4">
			<div className="flex items-center gap-2">
				<InfoIcon className="text-olive size-4" aria-hidden="true" />
				<span className="text-sm">
					Price cannot be changed after the first entry is purchased
				</span>
			</div>
		</div>
	);
}

interface OutcomeBreakdownProps {
	numberOfWinners: number;
	minParticipants: number;
}

/** "What happens when the sweepstakes ends?" breakdown list. */
function OutcomeBreakdown({
	numberOfWinners,
	minParticipants,
}: OutcomeBreakdownProps) {
	const showPartial = shouldShowPartialDrawCallout(
		minParticipants,
		numberOfWinners,
	);
	return (
		<div className="flex w-full flex-col gap-2 rounded-lg bg-yellow-100 p-4">
			<div className="flex items-center gap-2">
				<InfoIcon className="text-olive size-4 shrink-0" aria-hidden="true" />
				<span className="text-sm font-medium">
					What happens when the sweepstakes ends?
				</span>
			</div>
			<ul className="text-muted-foreground ml-6 flex list-disc flex-col gap-1 text-sm">
				{minParticipants > 0 ? (
					<li>
						<strong>Full draw</strong> — {minParticipants}+ participants:
						winners receive the declared prize
					</li>
				) : null}
				{showPartial ? (
					<li>
						<strong>Partial draw</strong> — {numberOfWinners} to{' '}
						{minParticipants - 1} participants: winners split the revenue (cash
						distribution)
					</li>
				) : null}
				<li>
					<strong>Auto-cancel</strong> — fewer than {numberOfWinners}{' '}
					{formatParticipantLabel(numberOfWinners)}: sweepstakes is cancelled
					and all entries are refunded
				</li>
			</ul>
		</div>
	);
}
