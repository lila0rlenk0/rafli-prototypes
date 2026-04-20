'use client';

import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import {
	Field,
	FieldDescription,
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
import { ID_TYPE_LABELS } from '@/lib/verification/labels';
import type { WinnerFormData } from '@/lib/validation/verification/verification-form-schema';

import { useVerificationForm } from '../verification-form-provider';

/**
 * WinnerDetailsStep Component
 *
 * Collects personal information for KYC winner verification.
 * Fields: name, DOB, country, ID type, bank/wallet (optional),
 * and shipping address (required — every winner submits a full address so the
 * winnings auto-claim path can always rely on structured shipping).
 *
 * @returns Form fields for winner verification
 */
export function WinnerDetailsStep() {
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
	const dateOfBirth = watch('dateOfBirth' as keyof WinnerFormData) as string;
	const identityDocType = watch(
		'identityDocType' as keyof WinnerFormData,
	) as string;

	// Named handlers for setValue calls — avoids inline arrows in JSX.
	// The `as never` casts are needed because VerificationFormData is a
	// discriminated union and RHF's generics don't narrow per branch.
	function handleDateOfBirthChange(value: string) {
		setValue('dateOfBirth' as keyof WinnerFormData, value as never, {
			shouldValidate: true,
		});
	}

	function handleIdentityDocTypeChange(value: string) {
		setValue('identityDocType' as keyof WinnerFormData, value as never, {
			shouldValidate: true,
		});
	}

	async function handleNext() {
		// Shipping fields are required now — validate them alongside identity
		// fields before advancing so the user fixes gaps on this step instead of
		// hitting schema errors after the documents step.
		const fieldsToValidate = [
			'fullLegalName',
			'dateOfBirth',
			'countryOfResidence',
			'identityDocType',
			'shippingName',
			'shippingStreet',
			'shippingCity',
			'shippingZip',
			'shippingCountry',
			'shippingPhone',
		] as const;

		const isValid = await trigger(
			fieldsToValidate as unknown as (keyof WinnerFormData)[],
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
							{...register('fullLegalName' as keyof WinnerFormData)}
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
						<FieldLabel htmlFor="countryOfResidence">
							Country of Residence
						</FieldLabel>
						<Input
							id="countryOfResidence"
							placeholder="e.g., United States, Brazil"
							{...register('countryOfResidence' as keyof WinnerFormData)}
						/>
						{fieldErrors.countryOfResidence ? (
							<FieldError>{fieldErrors.countryOfResidence.message}</FieldError>
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
						<FieldLabel htmlFor="bankAccountOrWallet">
							Bank Account / Wallet Address
						</FieldLabel>
						<FieldDescription>
							Required if you won a crypto or monetary prize. Put N/A if not
							applicable.
						</FieldDescription>
						<Input
							id="bankAccountOrWallet"
							placeholder="Bank account number or crypto wallet address"
							{...register('bankAccountOrWallet' as keyof WinnerFormData)}
						/>
						{fieldErrors.bankAccountOrWallet ? (
							<FieldError>{fieldErrors.bankAccountOrWallet.message}</FieldError>
						) : null}
					</Field>

					<Field>
						<FieldLabel>Prize Shipping Address</FieldLabel>
						<FieldDescription>
							Required for every winner. Provide a complete address even for
							monetary or digital prizes so we can ship any physical follow-up
							reward without a second KYC round.
						</FieldDescription>
					</Field>

					<Field>
						<FieldLabel htmlFor="shippingName">Recipient Name</FieldLabel>
						<Input
							id="shippingName"
							placeholder="Name as it should appear on the shipping label"
							{...register('shippingName' as keyof WinnerFormData)}
						/>
						{fieldErrors.shippingName ? (
							<FieldError>{fieldErrors.shippingName.message}</FieldError>
						) : null}
					</Field>

					<Field>
						<FieldLabel htmlFor="shippingStreet">Street Address</FieldLabel>
						<Input
							id="shippingStreet"
							placeholder="Street, unit/apartment, floor"
							{...register('shippingStreet' as keyof WinnerFormData)}
						/>
						{fieldErrors.shippingStreet ? (
							<FieldError>{fieldErrors.shippingStreet.message}</FieldError>
						) : null}
					</Field>

					<Field>
						<FieldLabel htmlFor="shippingCity">City</FieldLabel>
						<Input
							id="shippingCity"
							placeholder="City"
							{...register('shippingCity' as keyof WinnerFormData)}
						/>
						{fieldErrors.shippingCity ? (
							<FieldError>{fieldErrors.shippingCity.message}</FieldError>
						) : null}
					</Field>

					<Field>
						<FieldLabel htmlFor="shippingZip">Postal / ZIP Code</FieldLabel>
						<Input
							id="shippingZip"
							placeholder="Postal or ZIP code"
							{...register('shippingZip' as keyof WinnerFormData)}
						/>
						{fieldErrors.shippingZip ? (
							<FieldError>{fieldErrors.shippingZip.message}</FieldError>
						) : null}
					</Field>

					<Field>
						<FieldLabel htmlFor="shippingCountry">Country</FieldLabel>
						<Input
							id="shippingCountry"
							placeholder="e.g., United States, Brazil"
							{...register('shippingCountry' as keyof WinnerFormData)}
						/>
						{fieldErrors.shippingCountry ? (
							<FieldError>{fieldErrors.shippingCountry.message}</FieldError>
						) : null}
					</Field>

					<Field>
						<FieldLabel htmlFor="shippingPhone">
							Phone Number (optional)
						</FieldLabel>
						<FieldDescription>
							Couriers often need a contact number at delivery.
						</FieldDescription>
						<Input
							id="shippingPhone"
							type="tel"
							placeholder="e.g., +1 555 010 0000"
							{...register('shippingPhone' as keyof WinnerFormData)}
						/>
						{fieldErrors.shippingPhone ? (
							<FieldError>{fieldErrors.shippingPhone.message}</FieldError>
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
