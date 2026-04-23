import { z } from 'zod';

// ─── Constants ──────────────────────────────────────────────────────────────

/** Verification submission types — KYB for hosts, KYC for winners. */
export const VERIFICATION_TYPE = {
	KYB_INDIVIDUAL: 'kyb_individual',
	KYB_COMPANY: 'kyb_company',
	KYC_WINNER: 'kyc_winner',
} as const;

/** Government-issued identity document types accepted for verification */
export const IDENTITY_DOC_TYPE = {
	PASSPORT: 'passport',
	DRIVERS_LICENSE: 'drivers_license',
	NATIONAL_ID: 'national_id',
} as const;

/** Address proof document types accepted for KYB individual verification */
export const ADDRESS_DOC_TYPE = {
	UTILITY_BILL: 'utility_bill',
	BANK_STATEMENT: 'bank_statement',
	RENTAL_AGREEMENT: 'rental_agreement',
	GOVERNMENT_CORRESPONDENCE: 'government_correspondence',
} as const;

/** Raffle categories that a host can plan to offer */
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

/** Document purpose identifiers for upload endpoints */
export const DOCUMENT_PURPOSE = {
	ID_FRONT: 'id_front',
	ID_BACK: 'id_back',
	PROOF_OF_ADDRESS: 'proof_of_address',
	COMPANY_DOCS: 'company_docs',
	PROOF_OF_BUSINESS_ADDRESS: 'proof_of_business_address',
} as const;

/** Backend submission review statuses — pending/approved/rejected lifecycle. */
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

// ─── Types from Constants ───────────────────────────────────────────────────

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

// ─── Schemas ────────────────────────────────────────────────────────────────

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

/** Backend response for a single submission summary (list items). */
export const kycSubmissionResponseSchema = z.object({
	id: z.string(),
	type: verificationTypeSchema,
	status: kycSubmissionStatusSchema,
	submittedAt: z.string(),
});

/** Schema for a single uploaded KYC document with a signed download URL. */
export const documentUploadResponseSchema = z.object({
	documentId: z.string(),
	purpose: z.string(),
});

/** Schema for GET /me/verification — all user submissions. */
export const mySubmissionsResponseSchema = z.object({
	submissions: z.array(kycSubmissionResponseSchema),
});

/** Schema for a document attached to a KYC submission detail. */
export const kycDocumentSchema = z.object({
	id: z.string(),
	purpose: z.string(),
	contentType: z.string(),
	originalFilename: z.string(),
	/** Signed URL with ~5min TTL — null if generation failed */
	url: z.string().nullable(),
});

/**
 * Schema for GET /verification/:id — user-facing submission detail.
 *
 * Validation boundary: server-side — parsed in KYC detail server actions.
 */
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

/**
 * KYB individual form input.
 *
 * Validation boundary: both — client-side in the form, server-side via safeParse
 * in the server action before forwarding to API.
 */
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

/**
 * KYB company form input.
 *
 * Validation boundary: both — client-side in the form, server-side via safeParse.
 */
export const kybCompanyInputSchema = z.object({
	legalEntityName: z.string().min(1),
	businessRegistrationNumber: z.string().min(1),
	countryOfIncorporation: z.string().min(1),
	contactPersonName: z.string().min(1),
	contactEmail: z.string().email(),
});

/**
 * Structured shipping address — matches the backend `shippingInfoSchema` (min/max
 * bounds mirror `src/core/winnings/dto/winning.dto.ts`). Backend writes this shape
 * into `kyc_submissions.data.shippingAddress` which the winnings auto-claim
 * subscriber reads to advance `pending → awaiting_host` without prompting users
 * to re-enter shipping on the manual claim flow.
 */
export const shippingInfoSchema = z.object({
	name: z.string().min(1).max(100),
	address: z.string().min(1).max(500),
	city: z.string().min(1).max(100),
	zip: z.string().min(1).max(20),
	country: z.string().min(1).max(100),
	phone: z.string().max(30).nullable(),
});

/**
 * KYC winner form input.
 *
 * Validation boundary: both — client-side in the form, server-side via safeParse.
 *
 * `shippingAddress` stays nullable to mirror the backend `kycWinnerSchema`. The
 * backend reads JSONB via `extractKycWinnerShipping` which degrades null/malformed
 * shipping to the manual claim path. The UI form enforces shipping as mandatory
 * (`winnerFormSchema`), so every form-driven submission sends a populated object;
 * null remains reachable only from hypothetical service-to-service callers.
 */
export const kycWinnerInputSchema = z.object({
	fullLegalName: z.string().min(1),
	dateOfBirth: z.string().min(1),
	countryOfResidence: z.string().min(1),
	identityDocType: identityDocTypeSchema,
	bankAccountOrWallet: z.string().nullable(),
	shippingAddress: shippingInfoSchema.nullable(),
});

// ─── Inferred Types ─────────────────────────────────────────────────────────

/** Submission summary from list endpoints. */
export type KycSubmissionResponse = z.infer<typeof kycSubmissionResponseSchema>;
/** Response from document upload endpoint. */
export type DocumentUploadResponse = z.infer<
	typeof documentUploadResponseSchema
>;
/** KYC document with signed download URL. */
export type KycDocument = z.infer<typeof kycDocumentSchema>;
/** Full submission detail from GET /verification/:id. */
export type KycSubmissionDetail = z.infer<typeof kycSubmissionDetailSchema>;
/** Same shape as KycSubmissionResponse — a submission in the user's list */
export type KycSubmissionSummary = KycSubmissionResponse;
/** List of all user's KYC submissions. */
export type MySubmissionsResponse = z.infer<typeof mySubmissionsResponseSchema>;
/** KYB individual form input. */
export type KybIndividualInput = z.infer<typeof kybIndividualInputSchema>;
/** KYB company form input. */
export type KybCompanyInput = z.infer<typeof kybCompanyInputSchema>;
/** KYC winner form input. */
export type KycWinnerInput = z.infer<typeof kycWinnerInputSchema>;
/** Structured shipping address payload — see `shippingInfoSchema`. */
export type ShippingInfo = z.infer<typeof shippingInfoSchema>;
