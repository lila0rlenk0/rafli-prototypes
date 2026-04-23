'use client';

import type { CompanyFormData } from '@/lib/validation/verification/form-schema';

import { Button } from '@/components/ui/button';
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';

import { useVerificationForm } from '@/components/verification/form/form-provider';

/**
 * CompanyDetailsStep Component
 *
 * Collects company information for KYB company host verification.
 * Fields: legal entity name, registration number, country of incorporation,
 * contact person name, and contact email.
 *
 * @returns Form fields for company host verification
 */
export function CompanyDetailsStep() {
	const { form, nextStep } = useVerificationForm();
	const {
		register,
		formState: { errors },
		trigger,
	} = form;

	// Type casts needed throughout this step: VerificationFormData is a Zod
	// discriminated union, so RHF's generics don't narrow field names per branch.
	// Each step knows its branch but the form type is the full union.
	const fieldErrors = errors as Record<string, { message?: string }>;

	async function handleNext() {
		const fieldsToValidate = [
			'legalEntityName',
			'businessRegistrationNumber',
			'countryOfIncorporation',
			'contactPersonName',
			'contactEmail',
		] as const;

		const isValid = await trigger(
			fieldsToValidate as unknown as (keyof CompanyFormData)[],
		);
		if (isValid) {
			nextStep();
		}
	}

	return (
		<div className="flex flex-col gap-6 pt-6">
			<FieldSet>
				<FieldGroup>
					<Field>
						<FieldLabel htmlFor="legalEntityName">Legal Entity Name</FieldLabel>
						<Input
							id="legalEntityName"
							placeholder="Full legal name of the company"
							{...register('legalEntityName' as keyof CompanyFormData)}
						/>
						{fieldErrors.legalEntityName ? (
							<FieldError>{fieldErrors.legalEntityName.message}</FieldError>
						) : null}
					</Field>

					<Field>
						<FieldLabel htmlFor="businessRegistrationNumber">
							Business Registration Number
						</FieldLabel>
						<Input
							id="businessRegistrationNumber"
							placeholder="Company registration or incorporation number"
							{...register(
								'businessRegistrationNumber' as keyof CompanyFormData,
							)}
						/>
						{fieldErrors.businessRegistrationNumber ? (
							<FieldError>
								{fieldErrors.businessRegistrationNumber.message}
							</FieldError>
						) : null}
					</Field>

					<Field>
						<FieldLabel htmlFor="countryOfIncorporation">
							Country of Incorporation
						</FieldLabel>
						<Input
							id="countryOfIncorporation"
							placeholder="e.g., United States, United Kingdom"
							{...register('countryOfIncorporation' as keyof CompanyFormData)}
						/>
						{fieldErrors.countryOfIncorporation ? (
							<FieldError>
								{fieldErrors.countryOfIncorporation.message}
							</FieldError>
						) : null}
					</Field>

					<Field>
						<FieldLabel htmlFor="contactPersonName">
							Contact Person Name
						</FieldLabel>
						<Input
							id="contactPersonName"
							placeholder="Name of the primary contact"
							{...register('contactPersonName' as keyof CompanyFormData)}
						/>
						{fieldErrors.contactPersonName ? (
							<FieldError>{fieldErrors.contactPersonName.message}</FieldError>
						) : null}
					</Field>

					<Field>
						<FieldLabel htmlFor="contactEmail">Contact Email</FieldLabel>
						<Input
							id="contactEmail"
							type="email"
							placeholder="Business contact email address"
							{...register('contactEmail' as keyof CompanyFormData)}
						/>
						{fieldErrors.contactEmail ? (
							<FieldError>{fieldErrors.contactEmail.message}</FieldError>
						) : null}
					</Field>
				</FieldGroup>
			</FieldSet>

			<Button type="button" onClick={handleNext} className="mt-2 w-full">
				Continue to Documents
			</Button>
		</div>
	);
}
