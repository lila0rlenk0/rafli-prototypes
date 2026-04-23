'use client';

import type { UseFormReturn } from 'react-hook-form';

import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { ADDRESS_DOC_LABELS, ID_TYPE_LABELS } from '@/lib/verification/labels';
import type { VerificationFormData } from '@/lib/validation/verification/form-schema';

import { DOC_TYPE_KIND, useDocTypeField } from './use-doc-type-field';

interface IdentityDocumentFieldsetProps {
	form: UseFormReturn<VerificationFormData>;
	/** When true, renders the address-document select below the identity one. */
	includeAddressDoc: boolean;
}

/**
 * Document-type Select group shared across the verification detail steps.
 *
 * Individual-host step passes `includeAddressDoc` to render both the
 * identity + address selects; the winner step only collects identity.
 * Keeping the two related selects in one component matches how users
 * think about "what proof documents are you providing" — a single cluster.
 *
 * @returns One or two Select fields wired to RHF.
 */
export function IdentityDocumentFieldset({
	form,
	includeAddressDoc,
}: IdentityDocumentFieldsetProps) {
	const identity = useDocTypeField(form, DOC_TYPE_KIND.IDENTITY);
	const address = useDocTypeField(form, DOC_TYPE_KIND.ADDRESS);

	return (
		<>
			<Field>
				<FieldLabel>Proof of Identity Document Type</FieldLabel>
				<Select value={identity.value} onValueChange={identity.onChange}>
					<SelectTrigger className="w-full">
						<SelectValue placeholder="Select document type" />
					</SelectTrigger>
					<SelectContent>
						{Object.entries(ID_TYPE_LABELS).map(function renderIdOption([
							value,
							label,
						]) {
							return (
								<SelectItem key={value} value={value}>
									{label}
								</SelectItem>
							);
						})}
					</SelectContent>
				</Select>
				{identity.errorMessage ? (
					<FieldError>{identity.errorMessage}</FieldError>
				) : null}
			</Field>

			{includeAddressDoc ? (
				<Field>
					<FieldLabel>Proof of Address Document Type</FieldLabel>
					<Select value={address.value} onValueChange={address.onChange}>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Select document type" />
						</SelectTrigger>
						<SelectContent>
							{Object.entries(ADDRESS_DOC_LABELS).map(
								function renderAddressOption([value, label]) {
									return (
										<SelectItem key={value} value={value}>
											{label}
										</SelectItem>
									);
								},
							)}
						</SelectContent>
					</Select>
					{address.errorMessage ? (
						<FieldError>{address.errorMessage}</FieldError>
					) : null}
				</Field>
			) : null}
		</>
	);
}
