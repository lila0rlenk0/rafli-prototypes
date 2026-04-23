import { z } from 'zod';
import type { FieldErrors, FieldValues, UseFormReturn } from 'react-hook-form';

/**
 * Zod schema describing the subset of fields both the create and edit
 * wizards expose to the Tickets step's shared fieldsets. The concrete
 * `RaffleFormData` (create) and `EditFormData` (edit) schemas each define
 * a superset of this shape (see `create-form-schema.ts` / `edit-form-schema.ts`),
 * so typing shared components against this narrower surface keeps both
 * callers structurally compatible without duplicating field definitions.
 */
export const ticketsStepSchema = z.object({
	startDate: z.string(),
	startTime: z.string(),
	endDate: z.string(),
	endTime: z.string(),
	pricePerTicket: z.number(),
	numberOfWinners: z.number(),
	minParticipants: z.number(),
	maxParticipants: z.number(),
	checkInQuestion: z.string(),
});

/** Field-level surface shared by the create + edit Tickets step forms. */
export type TicketsStepPayload = z.infer<typeof ticketsStepSchema>;

/**
 * Generic constraint used by the shared fieldsets: any form whose values
 * structurally satisfy `TicketsStepPayload` can consume them. `extends FieldValues`
 * anchors the type to react-hook-form's own constraint.
 */
export type TicketsFormValues = TicketsStepPayload & FieldValues;

/**
 * Alias for the concrete `UseFormReturn` the shared fieldsets accept.
 *
 * We re-export react-hook-form's `UseFormReturn` directly (rather than
 * destructuring a narrower slice) — the hook's `formState.touchedFields`
 * uses a deep recursive shape (`FieldNamesMarkedBoolean`) that resists
 * hand-rolled approximations.
 */
export type TicketsStepForm<TValues extends TicketsFormValues> =
	UseFormReturn<TValues>;

/**
 * Subset of `FieldErrors` that the shared fieldsets actually index into.
 *
 * react-hook-form's `FieldErrors<TValues>` is a deep recursive map whose
 * shape depends on `TValues` — it can't be directly indexed by a generic
 * `Path<TValues>` key. Casting the raw `formState.errors` bag to this
 * flat record once at the fieldset boundary keeps the leaf JSX typed
 * against a simple name-to-message lookup.
 */
export type TicketsStepErrors = Partial<
	Record<keyof TicketsStepPayload, { message?: string }>
> &
	FieldErrors;

/** Flat touched-fields record matching `TicketsStepErrors`. */
export type TicketsStepTouched = Partial<
	Record<keyof TicketsStepPayload, boolean>
>;

/** Restriction toggles for the time-period fieldset. Defaults to unlocked. */
export interface TimePeriodRestrictions {
	/** Start date + start time inputs are disabled. */
	startLocked?: boolean;
	/** End date + end time inputs are disabled. */
	endLocked?: boolean;
}

/** Restriction toggles for the entries fieldset. Defaults to unlocked. */
export interface EntriesRestrictions {
	/** Price-per-entry input is disabled. */
	priceLocked?: boolean;
	/** Number-of-winners input is disabled. */
	winnersLocked?: boolean;
}
