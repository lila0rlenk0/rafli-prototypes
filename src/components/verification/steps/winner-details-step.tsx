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
import type { WinnerFormData } from '@/lib/validation/verification/form-schema';

import { VERIFICATION_TYPE } from '@/types/kyc-submission';

import { useVerificationForm } from '@/components/verification/form/form-provider';
import { AddressFieldset } from './shared/address-fieldset';
import { IdentityDocumentFieldset } from './shared/identity-document-fieldset';
import { useDobField } from './shared/use-dob-field';
import { shouldCollectAddressDoc } from './shared/use-doc-type-field';

// Upper picker bound — pre-computed so we don't re-instantiate `Date` on each
// render. Updates only at a year rollover which never happens mid-session.
const CURRENT_YEAR = new Date().getFullYear();

// Shipping fields validate alongside identity fields at "Next" so users fix
// gaps here instead of hitting schema errors after the documents step.
const WINNER_STEP_FIELDS = [
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

/**
 * WinnerDetailsStep Component
 *
 * Collects personal information for KYC winner verification.
 * Fields: name, DOB, country, ID type, bank/wallet (optional), and a
 * mandatory shipping address — the auto-claim path depends on structured
 * shipping being present on every approved submission.
 *
 * @returns Form fields for winner verification.
 */
export function WinnerDetailsStep() {
	const { form, nextStep } = useVerificationForm();
	const { register, formState, trigger } = form;
	const fieldErrors = formState.errors as Record<string, { message?: string }>;
	const dob = useDobField(form);

	async function handleNext() {
		const isValid = await trigger(
			WINNER_STEP_FIELDS as unknown as (keyof WinnerFormData)[],
		);
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
							{...register('fullLegalName' as keyof WinnerFormData)}
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

					<IdentityDocumentFieldset
						form={form}
						includeAddressDoc={shouldCollectAddressDoc(
							VERIFICATION_TYPE.KYC_WINNER,
						)}
					/>

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

					<AddressFieldset register={register} errors={fieldErrors} />
				</FieldGroup>
			</FieldSet>

			<Button type="button" onClick={handleNext} className="mt-2 w-full">
				Continue to Documents
			</Button>
		</div>
	);
}
