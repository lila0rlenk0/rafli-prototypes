'use client';

import { useCallback } from 'react';
import type { Path } from 'react-hook-form';

import type { TicketsFormValues, TicketsStepForm } from './types';

// Fields the Tickets step guards on `Continue` — same set in both wizards,
// so the continue handler is fully shared. The clear-all counterparts
// diverge (create clears pending promo codes; edit honours restrictions),
// so each composer owns its own `handleClearAll` locally.
const CONTINUE_FIELDS = [
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

interface UseTicketsStepHandlersParams<TValues extends TicketsFormValues> {
	form: TicketsStepForm<TValues>;
	/** Advance to the next wizard step — bound by the composer. */
	onAdvance: () => void;
}

interface UseTicketsStepHandlersReturn {
	/** Validates the Tickets step fields and advances when all pass. */
	handleContinue: () => Promise<void>;
}

/**
 * Shared Continue handler for the Tickets step. Validates the nine fields
 * the step owns, force-touches any that error so react-hook-form renders
 * the inline messages, and scrolls the first error into view.
 *
 * Scoped intentionally — `handleClearAll` diverges between create and
 * edit (create clears pending promo codes; edit respects lock flags) so
 * each composer keeps its own Clear All locally.
 *
 * @returns `{ handleContinue }` to bind to the step's Continue button.
 */
export function useTicketsStepActions<TValues extends TicketsFormValues>({
	form,
	onAdvance,
}: UseTicketsStepHandlersParams<TValues>): UseTicketsStepHandlersReturn {
	const { trigger, setValue, getValues } = form;

	const handleContinue = useCallback(async () => {
		// Cast the field list to the concrete form's `Path` union — safe
		// because `TValues extends TicketsFormValues` guarantees each name
		// is a valid path on the concrete schema. The TS checker can't
		// prove the overlap because `Path` is opaquely branded, so the
		// cast routes through `unknown` to satisfy the compiler.
		const paths = CONTINUE_FIELDS as unknown as readonly Path<TValues>[];
		const isValid = await trigger([...paths]);

		if (!isValid) {
			// Force-touch each field so the error messages render even if
			// the user never focused the input.
			for (const field of paths) {
				setValue(field, getValues(field), { shouldTouch: true });
			}
			// rAF: wait for React to commit the error nodes before scrolling.
			requestAnimationFrame(() => {
				const firstError = document.querySelector('.text-red-500');
				firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
			});
			return;
		}

		onAdvance();
	}, [trigger, setValue, getValues, onAdvance]);

	return { handleContinue };
}
