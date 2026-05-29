'use client';

import type { ChangeEvent } from 'react';

import type { Path, PathValue } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { CATEGORY_LABELS } from '@/lib/verification/labels';
import { cn } from '@/lib/class-names';
import type {
	IndividualFormData,
	VerificationFormData,
} from '@/lib/validation/verification/form-schema';

import { VERIFICATION_TYPE } from '@/types/kyc-submission';

import { useVerificationForm } from '@/components/verification/form/form-provider';
import { IdentityDocumentFieldset } from './shared/identity-document-fieldset';
import { useDobField } from './shared/use-dob-field';
import { shouldCollectAddressDoc } from './shared/use-doc-type-field';

const PHONE_ALLOWED_CHARS = /[^0-9+\-()\s]/g;

// Pre-computed once — the picker's upper bound matches "today" and changes
// only across year rollovers, which never happens during a single session.
const CURRENT_YEAR = new Date().getFullYear();

// Field names live in the form schema's union; PathValue narrows the value
// type at each setValue call, so no `as never` cast leaks past the boundary.
const PLANNED_CATEGORIES_FIELD =
	'plannedCategories' satisfies Path<VerificationFormData>;
const PHONE_NUMBER_FIELD = 'phoneNumber' satisfies Path<VerificationFormData>;

// Fields the step validates before advancing — kept adjacent to the step so
// the schema source of truth (verificationFormSchema) is the only place
// names are declared authoritatively. Typed as Path<VerificationFormData>
// because trigger() accepts the union's path set; all keys exist on
// IndividualFormData which contributes to that union.
const INDIVIDUAL_STEP_FIELDS: readonly Path<VerificationFormData>[] = [
	'fullLegalName',
	'dateOfBirth',
	PHONE_NUMBER_FIELD,
	'residentialAddress',
	'identityDocType',
	'addressDocType',
	PLANNED_CATEGORIES_FIELD,
];

/**
 * IndividualDetailsStep Component
 *
 * Collects personal information for KYB individual host verification.
 * Fields: name, DOB, phone, address, ID type, address doc type, planned
 * raffle categories. Email is pulled from the user's session in the
 * provider, not entered here.
 *
 * @returns Form fields for individual host verification.
 */
export function IndividualDetailsStep() {
	const { form, nextStep } = useVerificationForm();
	const { register, formState, setValue, watch, trigger } = form;
	// Cast once at the boundary — the union RHF type resists per-branch narrowing.
	const fieldErrors = formState.errors as Record<string, { message?: string }>;
	const dob = useDobField(form);

	const plannedCategories =
		(watch(PLANNED_CATEGORIES_FIELD) as string[] | undefined) ?? [];

	function handleCategoryToggle(category: string) {
		const updated = plannedCategories.includes(category)
			? plannedCategories.filter(function drop(c) {
					return c !== category;
				})
			: [...plannedCategories, category];
		setValue(
			PLANNED_CATEGORIES_FIELD,
			updated as PathValue<
				VerificationFormData,
				typeof PLANNED_CATEGORIES_FIELD
			>,
			{ shouldValidate: true },
		);
	}

	// Stripping non-phone characters on every keystroke keeps the mask in sync
	// with the Zod `regex` on `phoneNumber` — otherwise invalid chars would be
	// accepted into state and only fail at submit time.
	function handlePhoneChange(event: ChangeEvent<HTMLInputElement>) {
		const cleaned = event.target.value.replace(PHONE_ALLOWED_CHARS, '');
		setValue(
			PHONE_NUMBER_FIELD,
			cleaned as PathValue<VerificationFormData, typeof PHONE_NUMBER_FIELD>,
			{ shouldValidate: true },
		);
	}

	async function handleNext() {
		const isValid = await trigger([...INDIVIDUAL_STEP_FIELDS]);
		if (isValid) nextStep();
	}

	return (
		<div className="flex flex-col gap-6 pt-6">
			<FieldSet>
				<FieldGroup>
					<Field>
						<FieldLabel htmlFor="fullLegalName">Full Legal Name</FieldLabel>
						<Input
							id="fullLegalName"
							placeholder="As shown on your government-issued ID"
							{...register('fullLegalName' as keyof IndividualFormData)}
						/>
						{fieldErrors.fullLegalName ? (
							<FieldError>{fieldErrors.fullLegalName.message}</FieldError>
						) : null}
					</Field>

					<Field>
						<FieldLabel>Date of Birth</FieldLabel>
						<DatePicker
							value={dob.value}
							onValueChange={dob.onChange}
							placeholder="Select your date of birth"
							className="bg-transparent"
							captionLayout="dropdown"
							fromYear={1920}
							toYear={CURRENT_YEAR}
						/>
						{dob.errorMessage ? (
							<FieldError>{dob.errorMessage}</FieldError>
						) : null}
					</Field>

					<Field>
						<FieldLabel htmlFor="phoneNumber">Phone Number</FieldLabel>
						<Input
							id="phoneNumber"
							type="tel"
							placeholder="+1 (555) 000-0000"
							{...register('phoneNumber' as keyof IndividualFormData)}
							onChange={handlePhoneChange}
						/>
						{fieldErrors.phoneNumber ? (
							<FieldError>{fieldErrors.phoneNumber.message}</FieldError>
						) : null}
					</Field>

					<Field>
						<FieldLabel htmlFor="residentialAddress">
							Full Residential Address
						</FieldLabel>
						<Input
							id="residentialAddress"
							placeholder="Street, city, state/province, country, zip code"
							{...register('residentialAddress' as keyof IndividualFormData)}
						/>
						{fieldErrors.residentialAddress ? (
							<FieldError>{fieldErrors.residentialAddress.message}</FieldError>
						) : null}
					</Field>

					<IdentityDocumentFieldset
						form={form}
						includeAddressDoc={shouldCollectAddressDoc(
							VERIFICATION_TYPE.KYB_INDIVIDUAL,
						)}
					/>

					<Field>
						<FieldLabel>
							What kind of raffles are you planning to host?
						</FieldLabel>
						<CategoryChipGrid
							selected={plannedCategories}
							onToggle={handleCategoryToggle}
						/>
						{fieldErrors.plannedCategories ? (
							<FieldError>{fieldErrors.plannedCategories.message}</FieldError>
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

interface CategoryChipGridProps {
	selected: string[];
	onToggle: (value: string) => void;
}

/**
 * Toggle-chip grid for planned-raffle categories. Extracted so the parent
 * step stays under the 3-level JSX nesting budget.
 */
function CategoryChipGrid({ selected, onToggle }: CategoryChipGridProps) {
	return (
		<div className="flex flex-wrap gap-2">
			{Object.entries(CATEGORY_LABELS).map(function renderChip([value, label]) {
				const isActive = selected.includes(value);
				return (
					<button
						key={value}
						type="button"
						onClick={function handleClick() {
							onToggle(value);
						}}
						className={cn(
							'rounded-full border px-3.5 py-1.5 text-sm transition-colors',
							isActive
								? 'border-foreground bg-foreground text-background'
								: 'border-border hover:border-foreground/30',
						)}
					>
						{label}
					</button>
				);
			})}
		</div>
	);
}
