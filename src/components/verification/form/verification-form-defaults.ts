import { STEP_TITLES } from '@/lib/verification/constants';
import {
	type CompanyFormData,
	type IndividualFormData,
	type VerificationFormData,
	type WinnerFormData,
} from '@/lib/validation/verification/form-schema';
import { VERIFICATION_TYPE } from '@/types/kyc-submission';
import type { DefaultValues } from 'react-hook-form';

/** Derived from STEP_TITLES to prevent drift between title array and step count */
export const TOTAL_STEPS = STEP_TITLES.length;

export const INITIAL_FORM_VALUES: DefaultValues<VerificationFormData> = {
	verificationType: undefined,
	fullLegalName: '',
	dateOfBirth: '',
	phoneNumber: '',
	residentialAddress: '',
	identityDocType: undefined,
	addressDocType: undefined,
	plannedCategories: [],
	idFront: [],
	idBack: [],
	proofOfAddress: [],
};

export function getIndividualDefaults(): DefaultValues<IndividualFormData> {
	return {
		verificationType: VERIFICATION_TYPE.KYB_INDIVIDUAL,
		fullLegalName: '',
		dateOfBirth: '',
		phoneNumber: '',
		residentialAddress: '',
		identityDocType: undefined,
		addressDocType: undefined,
		plannedCategories: [],
		idFront: [],
		idBack: [],
		proofOfAddress: [],
	};
}

export function getCompanyDefaults(): DefaultValues<CompanyFormData> {
	return {
		verificationType: VERIFICATION_TYPE.KYB_COMPANY,
		legalEntityName: '',
		businessRegistrationNumber: '',
		countryOfIncorporation: '',
		contactPersonName: '',
		contactEmail: '',
		companyDocs: [],
		proofOfBusinessAddress: [],
	};
}

export function getWinnerDefaults(): DefaultValues<WinnerFormData> {
	return {
		verificationType: VERIFICATION_TYPE.KYC_WINNER,
		fullLegalName: '',
		dateOfBirth: '',
		countryOfResidence: '',
		identityDocType: undefined,
		bankAccountOrWallet: '',
		// Flat shipping fields — packed into a populated `shippingAddress` object
		// on submit. Shipping is mandatory for every winner (see `winnerFormSchema`),
		// so the form never emits null; the backend contract stays nullable only to
		// stay forward-compatible with future wallet-only service-to-service calls.
		shippingName: '',
		shippingStreet: '',
		shippingCity: '',
		shippingZip: '',
		shippingCountry: '',
		shippingPhone: '',
		idFront: [],
		idBack: [],
	};
}
