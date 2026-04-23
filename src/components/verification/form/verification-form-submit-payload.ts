import type { VerificationFormData } from '@/lib/validation/verification/form-schema';
import { submitCompany } from '@/services/kyc-submission/submit-company';
import { submitIndividual } from '@/services/kyc-submission/submit-individual';
import { submitWinner } from '@/services/kyc-submission/submit-winner';
import {
	DOCUMENT_PURPOSE,
	VERIFICATION_TYPE,
	type ShippingInfo,
} from '@/types/kyc-submission';

// =============================================================================
// SHIPPING PAYLOAD PACKING
// Winner form holds each address component flat (React Hook Form ergonomics).
// Shipping is mandatory, so every winner submission emits a populated
// ShippingInfo object — the phone stays nullable because couriers can proceed
// without it and the backend treats it as optional.
// =============================================================================

interface WinnerShippingFields {
	shippingCity: string;
	shippingCountry: string;
	shippingName: string;
	shippingPhone?: string;
	shippingStreet: string;
	shippingZip: string;
}

export function packWinnerShippingAddress(
	data: WinnerShippingFields,
): ShippingInfo {
	const phone = (data.shippingPhone ?? '').trim();

	return {
		name: data.shippingName.trim(),
		address: data.shippingStreet.trim(),
		city: data.shippingCity.trim(),
		zip: data.shippingZip.trim(),
		country: data.shippingCountry.trim(),
		phone: phone.length > 0 ? phone : null,
	};
}

interface DocumentEntry {
	purpose: string;
	file: File;
}

/**
 * Extracts document files from form data based on the verification type
 *
 * @returns Array of purpose-file pairs for sequential upload
 */
export function getDocumentsForUpload(
	data: VerificationFormData,
): DocumentEntry[] {
	const documents: DocumentEntry[] = [];

	if (data.verificationType === VERIFICATION_TYPE.KYB_INDIVIDUAL) {
		if (data.idFront[0]) {
			documents.push({
				purpose: DOCUMENT_PURPOSE.ID_FRONT,
				file: data.idFront[0],
			});
		}
		if (data.idBack[0]) {
			documents.push({
				purpose: DOCUMENT_PURPOSE.ID_BACK,
				file: data.idBack[0],
			});
		}
		if (data.proofOfAddress[0]) {
			documents.push({
				purpose: DOCUMENT_PURPOSE.PROOF_OF_ADDRESS,
				file: data.proofOfAddress[0],
			});
		}
	} else if (data.verificationType === VERIFICATION_TYPE.KYB_COMPANY) {
		if (data.companyDocs[0]) {
			documents.push({
				purpose: DOCUMENT_PURPOSE.COMPANY_DOCS,
				file: data.companyDocs[0],
			});
		}
		if (data.proofOfBusinessAddress[0]) {
			documents.push({
				purpose: DOCUMENT_PURPOSE.PROOF_OF_BUSINESS_ADDRESS,
				file: data.proofOfBusinessAddress[0],
			});
		}
	} else if (data.verificationType === VERIFICATION_TYPE.KYC_WINNER) {
		if (data.idFront[0]) {
			documents.push({
				purpose: DOCUMENT_PURPOSE.ID_FRONT,
				file: data.idFront[0],
			});
		}
		if (data.idBack?.[0]) {
			documents.push({
				purpose: DOCUMENT_PURPOSE.ID_BACK,
				file: data.idBack[0],
			});
		}
	}

	return documents;
}

/**
 * Calls the appropriate submit endpoint based on the verification type
 * branch. Isolated so the orchestrator stays linear.
 */
export async function submitVerificationByType(
	data: VerificationFormData,
	userEmail: string,
) {
	if (data.verificationType === VERIFICATION_TYPE.KYB_INDIVIDUAL) {
		return submitIndividual({
			fullLegalName: data.fullLegalName,
			dateOfBirth: data.dateOfBirth,
			email: userEmail,
			phoneNumber: data.phoneNumber,
			residentialAddress: data.residentialAddress,
			identityDocType: data.identityDocType,
			addressDocType: data.addressDocType,
			plannedCategories: data.plannedCategories,
		});
	}
	if (data.verificationType === VERIFICATION_TYPE.KYB_COMPANY) {
		return submitCompany({
			legalEntityName: data.legalEntityName,
			businessRegistrationNumber: data.businessRegistrationNumber,
			countryOfIncorporation: data.countryOfIncorporation,
			contactPersonName: data.contactPersonName,
			contactEmail: data.contactEmail,
		});
	}
	return submitWinner({
		fullLegalName: data.fullLegalName,
		dateOfBirth: data.dateOfBirth,
		countryOfResidence: data.countryOfResidence,
		identityDocType: data.identityDocType,
		bankAccountOrWallet: data.bankAccountOrWallet || null,
		shippingAddress: packWinnerShippingAddress(data),
	});
}
