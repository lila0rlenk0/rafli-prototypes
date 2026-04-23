'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';

import { PROMO_CODE_TYPE, type PromoCodeType } from '@/types/promo-code';

import {
	createPromoCodeFormSchema,
	type CreatePromoCodeFormData,
} from './schema';

interface UseCreatePromoCodeFormResult {
	form: UseFormReturn<CreatePromoCodeFormData>;
	handleTypeChange: (type: PromoCodeType) => void;
	handleUnlimitedUsesChange: (checked: boolean) => void;
	handleUnlimitedPerUserChange: (checked: boolean) => void;
	handleNoExpirationChange: (checked: boolean) => void;
}

/** Defaults for the create-promo form — first render only. */
const DEFAULT_VALUES_WITHOUT_TYPE = {
	count: 1,
	value: 1,
	unlimitedUses: false,
	maxUses: 1,
	unlimitedPerUser: true,
	maxRedemptionsPerUser: 0,
	noExpiration: true,
	expiresAt: undefined,
} as const;

/**
 * Builds the four field-conditional handlers in one place so the hook
 * body stays focused on form setup. Each handler preserves the
 * invariant between a checkbox flag and its paired numeric input.
 */
function buildFormHandlers(form: UseFormReturn<CreatePromoCodeFormData>) {
	return {
		handleTypeChange(type: PromoCodeType) {
			form.setValue('type', type);
			// Free tickets must stay integer-backed so the form never renders
			// a decimal quantity the schema rejects on submit.
			if (type === PROMO_CODE_TYPE.FREE_TICKETS) {
				form.setValue(
					'value',
					Math.max(1, Math.floor(form.getValues('value'))),
				);
			}
		},
		handleUnlimitedUsesChange(checked: boolean) {
			form.setValue('unlimitedUses', checked);
			form.setValue(
				'maxUses',
				checked ? 0 : Math.max(1, form.getValues('maxUses')),
			);
		},
		handleUnlimitedPerUserChange(checked: boolean) {
			form.setValue('unlimitedPerUser', checked);
			form.setValue(
				'maxRedemptionsPerUser',
				checked ? 0 : Math.max(1, form.getValues('maxRedemptionsPerUser')),
			);
		},
		handleNoExpirationChange(checked: boolean) {
			form.setValue('noExpiration', checked);
			if (checked) {
				form.setValue('expiresAt', undefined);
			}
		},
	};
}

/**
 * Sets up the promo-create form with default values and the four
 * field-conditional setters. Consolidating scaffolding in a hook keeps
 * the modal shell focused on dialog orchestration and submit.
 *
 * Watched values stay in the component because RHF's `watch()` can't
 * be memoized in a custom hook per `react-hooks/incompatible-library`.
 *
 * @returns Form instance + change handlers.
 */
export function useCreatePromoCodeForm(options: {
	allowFreeTickets: boolean;
}): UseCreatePromoCodeFormResult {
	const { allowFreeTickets } = options;
	const form = useForm<CreatePromoCodeFormData>({
		resolver: zodResolver(createPromoCodeFormSchema),
		defaultValues: {
			...DEFAULT_VALUES_WITHOUT_TYPE,
			type: allowFreeTickets
				? PROMO_CODE_TYPE.FREE_TICKETS
				: PROMO_CODE_TYPE.DISCOUNT_FIXED,
		},
	});

	// Adjust-state-during-render — see
	// https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
	const [prevAllowFreeTickets, setPrevAllowFreeTickets] =
		useState(allowFreeTickets);
	if (prevAllowFreeTickets !== allowFreeTickets) {
		setPrevAllowFreeTickets(allowFreeTickets);
		if (
			!allowFreeTickets &&
			form.getValues('type') === PROMO_CODE_TYPE.FREE_TICKETS
		) {
			form.setValue('type', PROMO_CODE_TYPE.DISCOUNT_FIXED);
		}
	}

	return { form, ...buildFormHandlers(form) };
}
