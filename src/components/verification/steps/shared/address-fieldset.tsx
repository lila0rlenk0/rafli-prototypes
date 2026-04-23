'use client';

import type { UseFormRegister } from 'react-hook-form';

import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type {
	VerificationFormData,
	WinnerFormData,
} from '@/lib/validation/verification/form-schema';

interface AddressFieldErrors {
	shippingName?: { message?: string };
	shippingStreet?: { message?: string };
	shippingCity?: { message?: string };
	shippingZip?: { message?: string };
	shippingCountry?: { message?: string };
	shippingPhone?: { message?: string };
}

interface AddressFieldsetProps {
	register: UseFormRegister<VerificationFormData>;
	errors: AddressFieldErrors;
}

// Cast once at the boundary — VerificationFormData is a Zod discriminated
// union, so `keyof` narrows to the shared discriminator and RHF's generics
// don't expose per-branch field names. These constants apply only in the
// winner branch but are read through the union-wide register.
type WinnerField = keyof WinnerFormData & keyof VerificationFormData;
const NAME = 'shippingName' as WinnerField;
const STREET = 'shippingStreet' as WinnerField;
const CITY = 'shippingCity' as WinnerField;
const ZIP = 'shippingZip' as WinnerField;
const COUNTRY = 'shippingCountry' as WinnerField;
const PHONE = 'shippingPhone' as WinnerField;

/**
 * Prize-shipping address fieldset for the KYC-winner step.
 *
 * The backend auto-claim path reads structured shipping off approved KYC
 * rows (`kyc_submissions.data.shippingAddress`), so every winner — even
 * wallet-only claimants — submits a full address here to keep the claim
 * flow from branching into a manual shipping-collection round.
 *
 * @returns Labelled input rows for name, street, city, zip, country, phone.
 */
export function AddressFieldset({ register, errors }: AddressFieldsetProps) {
	return (
		<>
			<Field>
				<FieldLabel>Prize Shipping Address</FieldLabel>
				<FieldDescription>
					Required for every winner. Provide a complete address even for
					monetary or digital prizes so we can ship any physical follow-up
					reward without a second KYC round.
				</FieldDescription>
			</Field>

			<AddressRow
				id="shippingName"
				label="Recipient Name"
				placeholder="Name as it should appear on the shipping label"
				register={register(NAME)}
				error={errors.shippingName?.message}
			/>
			<AddressRow
				id="shippingStreet"
				label="Street Address"
				placeholder="Street, unit/apartment, floor"
				register={register(STREET)}
				error={errors.shippingStreet?.message}
			/>
			<AddressRow
				id="shippingCity"
				label="City"
				placeholder="City"
				register={register(CITY)}
				error={errors.shippingCity?.message}
			/>
			<AddressRow
				id="shippingZip"
				label="Postal / ZIP Code"
				placeholder="Postal or ZIP code"
				register={register(ZIP)}
				error={errors.shippingZip?.message}
			/>
			<AddressRow
				id="shippingCountry"
				label="Country"
				placeholder="e.g., United States, Brazil"
				register={register(COUNTRY)}
				error={errors.shippingCountry?.message}
			/>

			<Field>
				<FieldLabel htmlFor="shippingPhone">Phone Number (optional)</FieldLabel>
				<FieldDescription>
					Couriers often need a contact number at delivery.
				</FieldDescription>
				<Input
					id="shippingPhone"
					type="tel"
					placeholder="e.g., +1 555 010 0000"
					{...register(PHONE)}
				/>
				{errors.shippingPhone?.message ? (
					<FieldError>{errors.shippingPhone.message}</FieldError>
				) : null}
			</Field>
		</>
	);
}

interface AddressRowProps {
	id: string;
	label: string;
	placeholder: string;
	register: ReturnType<UseFormRegister<VerificationFormData>>;
	error: string | undefined;
}

/** Single labelled input row used by every mandatory address field. */
function AddressRow({
	id,
	label,
	placeholder,
	register,
	error,
}: AddressRowProps) {
	return (
		<Field>
			<FieldLabel htmlFor={id}>{label}</FieldLabel>
			<Input id={id} placeholder={placeholder} {...register} />
			{error ? <FieldError>{error}</FieldError> : null}
		</Field>
	);
}
