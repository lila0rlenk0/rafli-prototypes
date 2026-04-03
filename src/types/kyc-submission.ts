import { z } from 'zod';

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * Verification type constants matching backend verification types
 */
export const VERIFICATION_TYPE = {
	KYB_INDIVIDUAL: 'kyb_individual',
	KYB_COMPANY: 'kyb_company',
	KYC_WINNER: 'kyc_winner',
} as const;

/**
 * Maps verification type constant to a user-facing label.
 * Centralized here to avoid duplicating the switch in every component
 * that displays verification type.
 *
 * @returns Readable label like "Individual Host", "Company Host", "Raffle Winner"
 */
export function getVerificationTypeLabel(type: string): string {
	switch (type) {
		case VERIFICATION_TYPE.KYB_INDIVIDUAL:
			return 'Individual Host';
		case VERIFICATION_TYPE.KYB_COMPANY:
			return 'Company Host';
		case VERIFICATION_TYPE.KYC_WINNER:
			return 'Raffle Winner';
		default:
			return 'Verification';
	}
}

/**
 * Government-issued identity document types accepted for verification
 */
export const IDENTITY_DOC_TYPE = {
	PASSPORT: 'passport',
	DRIVERS_LICENSE: 'drivers_license',
	NATIONAL_ID: 'national_id',
} as const;

/**
 * Address proof document types accepted for KYB individual verification
 */
export const ADDRESS_DOC_TYPE = {
	UTILITY_BILL: 'utility_bill',
	BANK_STATEMENT: 'bank_statement',
	RENTAL_AGREEMENT: 'rental_agreement',
	GOVERNMENT_CORRESPONDENCE: 'government_correspondence',
} as const;

/**
 * Raffle categories that a host can plan to offer
 */
export const PLANNED_CATEGORY = {
	ELECTRONICS: 'electronics',
	FASHION: 'fashion',
	GAMING: 'gaming',
	HOME_AND_LIVING: 'home_and_living',
	SPORTS: 'sports',
	COLLECTIBLES: 'collectibles',
	ART: 'art',
	OTHER: 'other',
} as const;

/**
 * Document purpose identifiers for upload endpoints
 */
export const DOCUMENT_PURPOSE = {
	ID_FRONT: 'id_front',
	ID_BACK: 'id_back',
	PROOF_OF_ADDRESS: 'proof_of_address',
	COMPANY_DOCS: 'company_docs',
	PROOF_OF_BUSINESS_ADDRESS: 'proof_of_business_address',
} as const;

/**
 * Maps document purpose constant to a user-facing label.
 * Centralized here alongside DOCUMENT_PURPOSE to avoid
 * duplicating the switch in every component.
 *
 * @returns Readable label like "ID Front", "Proof of Address"
 */
export function getDocumentPurposeLabel(purpose: string): string {
	switch (purpose) {
		case DOCUMENT_PURPOSE.ID_FRONT:
			return 'ID Front';
		case DOCUMENT_PURPOSE.ID_BACK:
			return 'ID Back';
		case DOCUMENT_PURPOSE.PROOF_OF_ADDRESS:
			return 'Proof of Address';
		case DOCUMENT_PURPOSE.COMPANY_DOCS:
			return 'Company Documents';
		case DOCUMENT_PURPOSE.PROOF_OF_BUSINESS_ADDRESS:
			return 'Business Address Proof';
		default:
			return purpose;
	}
}

/**
 * KYC submission review statuses
 */
export const KYC_SUBMISSION_STATUS = {
	PENDING: 'pending',
	APPROVED: 'approved',
	REJECTED: 'rejected',
} as const;

/** Maximum document file size: 10MB — shared between client form validation and server action guard */
export const MAX_DOC_SIZE = 10 * 1024 * 1024;

/** Allowed MIME types for verification documents — single source of truth
 * for client-side Zod validation, Dropzone accept config, and server-side
 * upload validation in upload-document.ts */
export const ACCEPTED_DOC_TYPES = [
	'application/pdf',
	'image/jpeg',
	'image/png',
	'image/webp',
] as const;

// ─── Types from Constants ────────────────────────────────────────────────────

export type VerificationType =
	(typeof VERIFICATION_TYPE)[keyof typeof VERIFICATION_TYPE];

export type IdentityDocType =
	(typeof IDENTITY_DOC_TYPE)[keyof typeof IDENTITY_DOC_TYPE];

export type AddressDocType =
	(typeof ADDRESS_DOC_TYPE)[keyof typeof ADDRESS_DOC_TYPE];

export type PlannedCategory =
	(typeof PLANNED_CATEGORY)[keyof typeof PLANNED_CATEGORY];

export type DocumentPurpose =
	(typeof DOCUMENT_PURPOSE)[keyof typeof DOCUMENT_PURPOSE];

export type KycSubmissionStatus =
	(typeof KYC_SUBMISSION_STATUS)[keyof typeof KYC_SUBMISSION_STATUS];

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const verificationTypeSchema = z.enum([
	VERIFICATION_TYPE.KYB_INDIVIDUAL,
	VERIFICATION_TYPE.KYB_COMPANY,
	VERIFICATION_TYPE.KYC_WINNER,
]);

export const identityDocTypeSchema = z.enum([
	IDENTITY_DOC_TYPE.PASSPORT,
	IDENTITY_DOC_TYPE.DRIVERS_LICENSE,
	IDENTITY_DOC_TYPE.NATIONAL_ID,
]);

export const addressDocTypeSchema = z.enum([
	ADDRESS_DOC_TYPE.UTILITY_BILL,
	ADDRESS_DOC_TYPE.BANK_STATEMENT,
	ADDRESS_DOC_TYPE.RENTAL_AGREEMENT,
	ADDRESS_DOC_TYPE.GOVERNMENT_CORRESPONDENCE,
]);

export const plannedCategorySchema = z.enum([
	PLANNED_CATEGORY.ELECTRONICS,
	PLANNED_CATEGORY.FASHION,
	PLANNED_CATEGORY.GAMING,
	PLANNED_CATEGORY.HOME_AND_LIVING,
	PLANNED_CATEGORY.SPORTS,
	PLANNED_CATEGORY.COLLECTIBLES,
	PLANNED_CATEGORY.ART,
	PLANNED_CATEGORY.OTHER,
]);

export const kycSubmissionStatusSchema = z.enum([
	KYC_SUBMISSION_STATUS.PENDING,
	KYC_SUBMISSION_STATUS.APPROVED,
	KYC_SUBMISSION_STATUS.REJECTED,
]);

/** Schema for submission creation response */
export const kycSubmissionResponseSchema = z.object({
	id: z.string(),
	type: verificationTypeSchema,
	status: kycSubmissionStatusSchema,
	submittedAt: z.string(),
});

/** Schema for document upload response */
export const documentUploadResponseSchema = z.object({
	documentId: z.string(),
	purpose: z.string(),
});

/** Schema for a single submission in the user's list */
export const kycSubmissionSummarySchema = z.object({
	id: z.string(),
	type: verificationTypeSchema,
	status: kycSubmissionStatusSchema,
	submittedAt: z.string(),
});

/** Schema for the my-verifications list response — wrapped in { submissions } */
export const mySubmissionsResponseSchema = z.object({
	submissions: z.array(kycSubmissionSummarySchema),
});

/** Schema for a document in the user's submission detail (with signed URL) */
export const kycDocumentSchema = z.object({
	id: z.string(),
	purpose: z.string(),
	contentType: z.string(),
	originalFilename: z.string(),
	/** Signed URL with ~5min TTL — null if generation failed */
	url: z.string().nullable(),
});

/** Schema for the user-facing submission detail response (GET /verification/:id) */
export const kycSubmissionDetailSchema = z.object({
	id: z.string(),
	type: verificationTypeSchema,
	status: kycSubmissionStatusSchema,
	/** All form fields as a generic record — shape varies by type */
	data: z.record(z.string(), z.unknown()),
	documents: z.array(kycDocumentSchema),
	submittedAt: z.string(),
	finalizedAt: z.string().nullable(),
	reviewedAt: z.string().nullable(),
	rejectionReason: z.string().nullable(),
});

// ─── Inferred Types ──────────────────────────────────────────────────────────

export type KycSubmissionResponse = z.infer<typeof kycSubmissionResponseSchema>;
export type DocumentUploadResponse = z.infer<
	typeof documentUploadResponseSchema
>;
export type KycDocument = z.infer<typeof kycDocumentSchema>;
export type KycSubmissionDetail = z.infer<typeof kycSubmissionDetailSchema>;
export type KycSubmissionSummary = z.infer<typeof kycSubmissionSummarySchema>;
export type MySubmissionsResponse = z.infer<typeof mySubmissionsResponseSchema>;

// ─── Input Schemas ──────────────────────────────────────────────────────────

/** Schema for KYB individual submission input — validated via safeParse in the server action */
export const kybIndividualInputSchema = z.object({
	fullLegalName: z.string().min(1),
	dateOfBirth: z.string().min(1),
	email: z.string().email(),
	phoneNumber: z.string().min(1),
	residentialAddress: z.string().min(1),
	identityDocType: identityDocTypeSchema,
	addressDocType: addressDocTypeSchema,
	plannedCategories: z.array(plannedCategorySchema).min(1),
});

/** Schema for KYB company submission input — validated via safeParse in the server action */
export const kybCompanyInputSchema = z.object({
	legalEntityName: z.string().min(1),
	businessRegistrationNumber: z.string().min(1),
	countryOfIncorporation: z.string().min(1),
	contactPersonName: z.string().min(1),
	contactEmail: z.string().email(),
});

/** Schema for KYC winner submission input — validated via safeParse in the server action */
export const kycWinnerInputSchema = z.object({
	fullLegalName: z.string().min(1),
	dateOfBirth: z.string().min(1),
	countryOfResidence: z.string().min(1),
	identityDocType: identityDocTypeSchema,
	bankAccountOrWallet: z.string().nullable(),
	shippingAddress: z.string().nullable(),
});

// ─── Input Types ────────────────────────────────────────────────────────────

export type KybIndividualInput = z.infer<typeof kybIndividualInputSchema>;
export type KybCompanyInput = z.infer<typeof kybCompanyInputSchema>;
export type KycWinnerInput = z.infer<typeof kycWinnerInputSchema>;
