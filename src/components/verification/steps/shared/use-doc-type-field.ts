'use client';

import type { UseFormReturn } from 'react-hook-form';

import type { VerificationFormData } from '@/lib/validation/verification/form-schema';
import {
	VERIFICATION_TYPE,
	type VerificationType,
} from '@/types/kyc-submission';

// Single source of truth for the two document-type slots used across the
// verification steps. Exhaustive switch below relies on these literals.
export const DOC_TYPE_KIND = {
	IDENTITY: 'identity',
	ADDRESS: 'address',
} as const;

export type DocTypeKind = (typeof DOC_TYPE_KIND)[keyof typeof DOC_TYPE_KIND];

interface UseDocTypeFieldResult {
	/** Currently-selected document type value (empty string when unset). */
	value: string;
	/** Writes the chosen document type back into the form. */
	onChange: (value: string) => void;
	/** RHF validation message for this field, or `undefined` when valid. */
	errorMessage: string | undefined;
}

/**
 * Returns `true` when the verification type needs an address-document select
 * alongside the identity-document select. Only KYB individual hosts collect
 * address proof at the step-1 level — company hosts and winners don't.
 *
 * Exhaustive switch so adding a new verification type fails to compile here
 * until the address-doc rule is confirmed for the new branch.
 *
 * @returns Whether to render the address-doc select for this verification type.
 */
export function shouldCollectAddressDoc(
	type: VerificationType | null,
): boolean {
	if (type === null) return false;
	switch (type) {
		case VERIFICATION_TYPE.KYB_INDIVIDUAL:
			return true;
		case VERIFICATION_TYPE.KYB_COMPANY:
			return false;
		case VERIFICATION_TYPE.KYC_WINNER:
			return false;
		default: {
			const never_: never = type;
			return never_;
		}
	}
}

/** The two document-type RHF field names this hook knows how to drive. */
export type DocTypeFieldName = 'identityDocType' | 'addressDocType';

/**
 * Maps a `DocTypeKind` to the RHF field it writes into. Exposed because the
 * exhaustive switch surfaces "is a new kind still wired?" as a compile error
 * and because the mapping is pure — unit-testable without RHF.
 *
 * @returns The form field name for the supplied kind.
 */
export function resolveDocTypeFieldName(kind: DocTypeKind): DocTypeFieldName {
	switch (kind) {
		case DOC_TYPE_KIND.IDENTITY:
			return 'identityDocType';
		case DOC_TYPE_KIND.ADDRESS:
			return 'addressDocType';
		default: {
			const never_: never = kind;
			return never_;
		}
	}
}

/**
 * Document-type Select binding for KYB and KYC steps.
 *
 * Reused by individual (identity + address) and winner (identity only) —
 * the `kind` parameter picks which form field the select writes to so a
 * single step can call this hook twice without field-name duplication.
 *
 * @returns Wired value / onChange / errorMessage for the Select primitive.
 */
export function useDocTypeField(
	form: UseFormReturn<VerificationFormData>,
	kind: DocTypeKind,
): UseDocTypeFieldResult {
	const { watch, setValue, formState } = form;
	const fieldName = resolveDocTypeFieldName(kind);
	// RHF's generics resist per-branch narrowing on a discriminated union, so
	// the field name is cast once here to satisfy `watch` / `setValue`.
	const rhfField = fieldName as keyof VerificationFormData;
	const value = (watch(rhfField) as string | undefined) ?? '';
	const errors = formState.errors as Record<string, { message?: string }>;

	function onChange(next: string) {
		setValue(rhfField, next as never, { shouldValidate: true });
	}

	return {
		value,
		onChange,
		errorMessage: errors[fieldName]?.message,
	};
}
