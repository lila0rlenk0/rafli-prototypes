import { z } from 'zod';

import {
	ACCEPTED_DOC_TYPES,
	ADDRESS_DOC_TYPE,
	IDENTITY_DOC_TYPE,
	MAX_DOC_SIZE,
	PLANNED_CATEGORY,
	VERIFICATION_TYPE,
} from '@/types/kyc-submission';

// Re-export so components importing from schema.ts don't need to change
export { ACCEPTED_DOC_TYPES, MAX_DOC_SIZE };

/** Dropzone-compatible accept map derived from ACCEPTED_DOC_TYPES */
export const ACCEPTED_DOC_TYPES_MAP: Record<string, string[]> = {
	'application/pdf': ['.pdf'],
	'image/jpeg': ['.jpg', '.jpeg'],
	'image/png': ['.png'],
	'image/webp': ['.webp'],
};

const documentFileSchema = z
	.instanceof(File)
	.refine(file => file.size <= MAX_DOC_SIZE, 'File must be less than 10MB')
	.refine(
		file => (ACCEPTED_DOC_TYPES as readonly string[]).includes(file.type),
		'File must be PDF, JPEG, PNG, or WebP',
	);

const requiredDocumentSchema = z
	.array(documentFileSchema)
	.min(1, 'Please upload a document');

const optionalDocumentSchema = z.array(documentFileSchema);

// ─── Form Schemas ────────────────────────────────────────────────────────────

/** Schema for KYB individual host verification */
export const individualFormSchema = z.object({
	verificationType: z.literal(VERIFICATION_TYPE.KYB_INDIVIDUAL),
	fullLegalName: z
		.string()
		.min(2, 'Name must be at least 2 characters')
		.max(200, 'Name must be less than 200 characters'),
	dateOfBirth: z.string().min(1, 'Date of birth is required'),
	phoneNumber: z
		.string()
		.min(5, 'Phone number must be at least 5 characters')
		.max(30, 'Phone number must be less than 30 characters')
		.regex(
			/^[0-9+\-()\s]+$/,
			'Only numbers, +, -, parentheses, and spaces are allowed',
		),
	residentialAddress: z
		.string()
		.min(10, 'Address must be at least 10 characters')
		.max(500, 'Address must be less than 500 characters'),
	identityDocType: z.enum(
		[
			IDENTITY_DOC_TYPE.PASSPORT,
			IDENTITY_DOC_TYPE.DRIVERS_LICENSE,
			IDENTITY_DOC_TYPE.NATIONAL_ID,
		],
		{ message: 'Please select an ID type' },
	),
	addressDocType: z.enum(
		[
			ADDRESS_DOC_TYPE.UTILITY_BILL,
			ADDRESS_DOC_TYPE.BANK_STATEMENT,
			ADDRESS_DOC_TYPE.RENTAL_AGREEMENT,
			ADDRESS_DOC_TYPE.GOVERNMENT_CORRESPONDENCE,
		],
		{ message: 'Please select a document type' },
	),
	plannedCategories: z
		.array(
			z.enum([
				PLANNED_CATEGORY.ELECTRONICS,
				PLANNED_CATEGORY.FASHION,
				PLANNED_CATEGORY.GAMING,
				PLANNED_CATEGORY.HOME_AND_LIVING,
				PLANNED_CATEGORY.SPORTS,
				PLANNED_CATEGORY.COLLECTIBLES,
				PLANNED_CATEGORY.ART,
				PLANNED_CATEGORY.OTHER,
			]),
		)
		.min(1, 'Please select at least one category'),
	idFront: requiredDocumentSchema,
	idBack: requiredDocumentSchema,
	proofOfAddress: requiredDocumentSchema,
});

/** Schema for KYB company host verification */
export const companyFormSchema = z.object({
	verificationType: z.literal(VERIFICATION_TYPE.KYB_COMPANY),
	legalEntityName: z
		.string()
		.min(2, 'Entity name must be at least 2 characters')
		.max(300, 'Entity name must be less than 300 characters'),
	businessRegistrationNumber: z
		.string()
		.min(1, 'Registration number is required')
		.max(100, 'Registration number must be less than 100 characters'),
	countryOfIncorporation: z
		.string()
		.min(2, 'Country is required')
		.max(100, 'Country must be less than 100 characters'),
	contactPersonName: z
		.string()
		.min(2, 'Contact name must be at least 2 characters')
		.max(200, 'Contact name must be less than 200 characters'),
	contactEmail: z.string().email('Please enter a valid email address'),
	companyDocs: requiredDocumentSchema,
	proofOfBusinessAddress: requiredDocumentSchema,
});

/** Schema for KYC winner verification */
export const winnerFormSchema = z.object({
	verificationType: z.literal(VERIFICATION_TYPE.KYC_WINNER),
	fullLegalName: z
		.string()
		.min(2, 'Name must be at least 2 characters')
		.max(200, 'Name must be less than 200 characters'),
	dateOfBirth: z.string().min(1, 'Date of birth is required'),
	countryOfResidence: z
		.string()
		.min(2, 'Country is required')
		.max(100, 'Country must be less than 100 characters'),
	identityDocType: z.enum(
		[
			IDENTITY_DOC_TYPE.PASSPORT,
			IDENTITY_DOC_TYPE.DRIVERS_LICENSE,
			IDENTITY_DOC_TYPE.NATIONAL_ID,
		],
		{ message: 'Please select an ID type' },
	),
	bankAccountOrWallet: z
		.string()
		.max(500, 'Must be less than 500 characters')
		.default(''),
	shippingAddress: z
		.string()
		.max(500, 'Must be less than 500 characters')
		.default(''),
	idFront: requiredDocumentSchema,
	idBack: optionalDocumentSchema,
});

/**
 * Discriminated union schema for all verification form types
 * React Hook Form uses the `verificationType` discriminator to validate
 * only the relevant fields for the selected verification type.
 */
export const verificationFormSchema = z.discriminatedUnion('verificationType', [
	individualFormSchema,
	companyFormSchema,
	winnerFormSchema,
]);

/** Inferred union type for the verification form */
export type VerificationFormData = z.infer<typeof verificationFormSchema>;

/** Individual form data type */
export type IndividualFormData = z.infer<typeof individualFormSchema>;

/** Company form data type */
export type CompanyFormData = z.infer<typeof companyFormSchema>;

/** Winner form data type */
export type WinnerFormData = z.infer<typeof winnerFormSchema>;
