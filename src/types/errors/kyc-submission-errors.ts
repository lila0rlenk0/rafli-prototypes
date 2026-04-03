import type { CommonErrorCode } from './common-errors';

/**
 * KYC Submission Error Codes
 *
 * Backend errors for KYB/KYC verification submission endpoints (`core:verification:*` prefix).
 */
export const KYC_SUBMISSION_ERROR_CODES = {
	/** User already has a pending or approved submission of this type */
	ALREADY_PENDING: 'core:verification:already-pending',
	/** Submission not found by ID */
	NOT_FOUND: 'core:verification:not-found',
	/** Invalid document purpose for the submission type */
	INVALID_PURPOSE: 'core:verification:invalid-purpose',
	/** Document already uploaded for this purpose — use replace semantics */
	DOCUMENT_EXISTS: 'core:verification:document-exists',
	/** Submission has already been finalized */
	ALREADY_FINALIZED: 'core:verification:already-finalized',
	/** Submission is not in pending status — already approved or rejected */
	NOT_PENDING: 'core:verification:not-pending',
	/** Required documents missing — finalization blocked */
	INCOMPLETE_DOCUMENTS: 'core:verification:incomplete-documents',
	/** Email does not match account email (KYB individual) */
	EMAIL_MISMATCH: 'core:verification:email-mismatch',
	/** Ownership or auth mismatch on the submission */
	PERMISSION_DENIED: 'core:verification:permission-denied',
	/** Invalid verification type value */
	INVALID_TYPE: 'core:verification:invalid-type',
	/** Frontend-only: client-side file validation failed before upload (MIME type or size) */
	DOCUMENT_UPLOAD_FAILED: 'document_upload_failed',
	/** Generic fetch failure */
	FETCH_FAILED: 'fetch_failed',
} as const;

/**
 * Type representing all possible KYC submission error codes
 */
export type KycSubmissionErrorCode =
	| (typeof KYC_SUBMISSION_ERROR_CODES)[keyof typeof KYC_SUBMISSION_ERROR_CODES]
	| CommonErrorCode;
