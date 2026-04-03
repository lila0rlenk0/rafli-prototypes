import {
	ADDRESS_DOC_TYPE,
	IDENTITY_DOC_TYPE,
	PLANNED_CATEGORY,
	VERIFICATION_TYPE,
	type AddressDocType,
	type IdentityDocType,
	type PlannedCategory,
	type VerificationType,
} from '@/types/kyc-submission';

/**
 * User-facing labels for verification form display values.
 * Shared between the detail steps and review step to avoid duplication.
 *
 * Typed with exhaustive keys — adding a new enum value without a
 * corresponding label entry causes a compile error.
 */

export const VERIFICATION_TYPE_LABELS: Record<VerificationType, string> = {
	[VERIFICATION_TYPE.KYB_INDIVIDUAL]: 'Individual Host',
	[VERIFICATION_TYPE.KYB_COMPANY]: 'Company Host',
	[VERIFICATION_TYPE.KYC_WINNER]: 'Raffle Winner',
};

export const ID_TYPE_LABELS: Record<IdentityDocType, string> = {
	[IDENTITY_DOC_TYPE.PASSPORT]: 'Passport',
	[IDENTITY_DOC_TYPE.DRIVERS_LICENSE]: "Driver's License",
	[IDENTITY_DOC_TYPE.NATIONAL_ID]: 'National ID Card',
};

export const ADDRESS_DOC_LABELS: Record<AddressDocType, string> = {
	[ADDRESS_DOC_TYPE.UTILITY_BILL]: 'Utility Bill',
	[ADDRESS_DOC_TYPE.BANK_STATEMENT]: 'Bank Statement',
	[ADDRESS_DOC_TYPE.RENTAL_AGREEMENT]: 'Rental Agreement',
	[ADDRESS_DOC_TYPE.GOVERNMENT_CORRESPONDENCE]: 'Government Correspondence',
};

export const CATEGORY_LABELS: Record<PlannedCategory, string> = {
	[PLANNED_CATEGORY.ELECTRONICS]: 'Electronics',
	[PLANNED_CATEGORY.FASHION]: 'Fashion',
	[PLANNED_CATEGORY.GAMING]: 'Gaming',
	[PLANNED_CATEGORY.HOME_AND_LIVING]: 'Home & Living',
	[PLANNED_CATEGORY.SPORTS]: 'Sports',
	[PLANNED_CATEGORY.COLLECTIBLES]: 'Collectibles',
	[PLANNED_CATEGORY.ART]: 'Art',
	[PLANNED_CATEGORY.OTHER]: 'Other',
};
