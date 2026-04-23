import type { z } from 'zod';

import {
	CRYPTO_FORM_DEFAULTS,
	type raffleFormSchema,
} from '@/lib/validation/raffle/create-form-schema';

type RaffleFormData = z.infer<typeof raffleFormSchema>;

/**
 * Blank form state used for the initial mount and any reset after a
 * successful create. Returned from a factory so each call yields a
 * fresh mutable object — RHF requires mutable default values and
 * `as const` on the constant would fail the `coverImage` File[] type.
 *
 * @returns A fresh default-values object for `useForm().reset(...)`.
 */
export function getRaffleFormDefaults(): RaffleFormData {
	return {
		title: '',
		description: '',
		price: Number.NaN,
		category: '',
		coverImage: [],
		startDate: '',
		startTime: '',
		endDate: '',
		endTime: '',
		pricePerTicket: Number.NaN,
		numberOfWinners: Number.NaN,
		minParticipants: 0,
		maxParticipants: 0,
		checkInQuestion: '',
		...CRYPTO_FORM_DEFAULTS,
	};
}
