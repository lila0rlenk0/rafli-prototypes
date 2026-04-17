'use client';

import type { ChangeEvent } from 'react';

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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	CATEGORY_LABELS,
	ADDRESS_DOC_LABELS,
	ID_TYPE_LABELS,
} from '@/lib/verification/labels';
import { cn } from '@/lib/utils';
import type { IndividualFormData } from '@/lib/validation/verification/verification-form-schema';

import { useVerificationForm } from '../verification-form-provider';

const PHONE_ALLOWED_CHARS = /[^0-9+\-()\s]/g;

/**
 * IndividualDetailsStep Component
 *
 * Collects personal information for KYB individual host verification.
 * Fields: name, DOB, phone, address, ID type, address doc type,
 * and planned raffle categories. Email is sent automatically from the
 * user's session.
 *
 * @returns Form fields for individual host verification
 */
export function IndividualDetailsStep() {
	const { form, nextStep } = useVerificationForm();
	const {
		register,
		formState: { errors },
		setValue,
		watch,
		trigger,
	} = form;

	// Type casts needed throughout this step: VerificationFormData is a Zod
	// discriminated union, so RHF's generics don't narrow field names per branch.
	// Each step knows its branch but the form type is the full union.
	const fieldErrors = errors as Record<string, { message?: string }>;

	const dateOfBirth = watch(
		'dateOfBirth' as keyof IndividualFormData,
	) as string;
	const identityDocType = watch(
		'identityDocType' as keyof IndividualFormData,
	) as string;
	const addressDocType = watch(
		'addressDocType' as keyof IndividualFormData,
	) as string;
	const plannedCategories =
		(watch('plannedCategories' as keyof IndividualFormData) as
			| string[]
			| undefined) ?? [];

	// Named handlers for setValue calls — avoids inline arrows in JSX.
	// The `as never` casts are needed because VerificationFormData is a
	// discriminated union and RHF's generics don't narrow per branch.
	function handleDateOfBirthChange(value: string) {
		setValue('dateOfBirth' as keyof IndividualFormData, value as never, {
			shouldValidate: true,
		});
	}

	function handleIdentityDocTypeChange(value: string) {
		setValue('identityDocType' as keyof IndividualFormData, value as never, {
			shouldValidate: true,
		});
	}

	function handleAddressDocTypeChange(value: string) {
		setValue('addressDocType' as keyof IndividualFormData, value as never, {
			shouldValidate: true,
		});
	}

	function handleCategoryToggle(category: string) {
		const current = plannedCategories;
		const updated = current.includes(category)
			? current.filter((c: string) => c !== category)
			: [...current, category];
		setValue(
			'plannedCategories' as keyof IndividualFormData,
			updated as never,
			{
				shouldValidate: true,
			},
		);
	}

	/**
	 * Strips non-phone characters on input to enforce the mask
	 */
	function handlePhoneChange(event: ChangeEvent<HTMLInputElement>) {
		const cleaned = event.target.value.replace(PHONE_ALLOWED_CHARS, '');
		setValue('phoneNumber' as keyof IndividualFormData, cleaned as never, {
			shouldValidate: true,
		});
	}

	async function handleNext() {
		const fieldsToValidate = [
			'fullLegalName',
			'dateOfBirth',
			'phoneNumber',
			'residentialAddress',
			'identityDocType',
			'addressDocType',
			'plannedCategories',
		] as const;

		const isValid = await trigger(
			fieldsToValidate as unknown as (keyof IndividualFormData)[],
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
							value={dateOfBirth}
							onValueChange={handleDateOfBirthChange}
							placeholder="Select your date of birth"
							className="bg-transparent"
							captionLayout="dropdown"
							fromYear={1920}
							toYear={new Date().getFullYear()}
						/>
						{fieldErrors.dateOfBirth ? (
							<FieldError>{fieldErrors.dateOfBirth.message}</FieldError>
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

					<Field>
						<FieldLabel>Proof of Identity Document Type</FieldLabel>
						<Select
							value={identityDocType}
							onValueChange={handleIdentityDocTypeChange}
						>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Select document type" />
							</SelectTrigger>
							<SelectContent>
								{Object.entries(ID_TYPE_LABELS).map(([value, label]) => (
									<SelectItem key={value} value={value}>
										{label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{fieldErrors.identityDocType ? (
							<FieldError>{fieldErrors.identityDocType.message}</FieldError>
						) : null}
					</Field>

					<Field>
						<FieldLabel>Proof of Address Document Type</FieldLabel>
						<Select
							value={addressDocType}
							onValueChange={handleAddressDocTypeChange}
						>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Select document type" />
							</SelectTrigger>
							<SelectContent>
								{Object.entries(ADDRESS_DOC_LABELS).map(([value, label]) => (
									<SelectItem key={value} value={value}>
										{label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{fieldErrors.addressDocType ? (
							<FieldError>{fieldErrors.addressDocType.message}</FieldError>
						) : null}
					</Field>

					<Field>
						<FieldLabel>
							What kind of raffles are you planning to host?
						</FieldLabel>
						<div className="flex flex-wrap gap-2">
							{Object.entries(CATEGORY_LABELS).map(([value, label]) => (
								<button
									key={value}
									type="button"
									onClick={() => handleCategoryToggle(value)}
									className={cn(
										'rounded-full border px-3.5 py-1.5 text-sm transition-colors',
										plannedCategories.includes(value)
											? 'border-black bg-black text-white'
											: 'border-border hover:border-black/30',
									)}
								>
									{label}
								</button>
							))}
						</div>
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
