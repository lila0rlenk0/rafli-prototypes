'use client';

import type { UseFormReturn } from 'react-hook-form';

import type { VerificationFormData } from '@/lib/validation/verification/form-schema';

// VerificationFormData is a Zod discriminated union — RHF's generics can't
// narrow field names per branch, so each caller accepts the union-wide form
// and this hook performs a single cast at the boundary on behalf of all
// three steps that collect a date of birth (Individual, Winner).
const DOB_FIELD = 'dateOfBirth' as keyof VerificationFormData;

interface UseDobFieldResult {
	/** Current ISO-date string from the form (empty string when unset). */
	value: string;
	/** Writes the picker's chosen ISO date back into the form. */
	onChange: (value: string) => void;
	/** RHF validation message for `dateOfBirth`, or `undefined` when valid. */
	errorMessage: string | undefined;
}

/**
 * Date-of-birth field binding for KYB-individual and KYC-winner steps.
 *
 * Centralises the `watch` + `setValue` + error-lookup trio so the JSX below
 * stays composable. Validation rules live in `verificationFormSchema` —
 * this hook never throws; it simply surfaces the RHF error message.
 *
 * @returns Wired value / onChange / errorMessage for the DatePicker.
 */
export function useDobField(
	form: UseFormReturn<VerificationFormData>,
): UseDobFieldResult {
	const { watch, setValue, formState } = form;
	const value = (watch(DOB_FIELD) as string | undefined) ?? '';
	const errors = formState.errors as Record<string, { message?: string }>;

	function onChange(next: string) {
		// `as never` is forced by RHF's union-narrowed `setValue` generic — the
		// discriminated union prevents inferring a single branch here.
		setValue(DOB_FIELD, next as never, { shouldValidate: true });
	}

	return { value, onChange, errorMessage: errors.dateOfBirth?.message };
}
