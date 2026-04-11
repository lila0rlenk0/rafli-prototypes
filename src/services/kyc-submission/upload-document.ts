'use server';

import { ZodError } from 'zod';

import { authenticatedClient } from '@/lib/api/client';
import {
	captureContractDrift,
	captureServiceError,
} from '@/lib/sentry/capture';
import { API_TIMEOUTS } from '@/lib/api/config';
import { failure, mapKycSubmissionError, success } from '@/lib/errors';
import {
	KYC_SUBMISSION_ERROR_CODES,
	type KycSubmissionErrorCode,
} from '@/types/errors';
import {
	ACCEPTED_DOC_TYPES,
	documentUploadResponseSchema,
	MAX_DOC_SIZE,
	type DocumentUploadResponse,
} from '@/types/kyc-submission';
import type { ServiceResponse } from '@/types/service-response';

/**
 * Uploads a verification document for a submission
 *
 * @param submissionId - The submission to attach the document to
 * @param purpose - Document purpose (e.g., 'id_front', 'id_back', 'proof_of_address')
 * @param file - The document file to upload
 * @returns ServiceResponse with document details on success
 */
export async function uploadDocument(
	submissionId: string,
	purpose: string,
	file: File,
): Promise<ServiceResponse<DocumentUploadResponse, KycSubmissionErrorCode>> {
	try {
		// Step 1: Validate file type against accepted document types
		if (!(ACCEPTED_DOC_TYPES as readonly string[]).includes(file.type)) {
			return failure(KYC_SUBMISSION_ERROR_CODES.DOCUMENT_UPLOAD_FAILED);
		}

		// Step 2: Validate file size against max document size limit
		if (file.size > MAX_DOC_SIZE) {
			return failure(KYC_SUBMISSION_ERROR_CODES.DOCUMENT_UPLOAD_FAILED);
		}

		// Step 3: Upload document to backend — attached to submission with given purpose
		const formData = new FormData();
		formData.append('file', file);

		const response = await authenticatedClient.post(
			`/verification/${submissionId}/documents/${purpose}`,
			formData,
			{
				timeout: API_TIMEOUTS.UPLOAD,
				headers: {
					'Content-Type': 'multipart/form-data',
				},
			},
		);

		// Step 4: Validate response — contains document details with signed download URLs
		return success(documentUploadResponseSchema.parse(response.data));
	} catch (error) {
		if (error instanceof ZodError) {
			captureContractDrift(error, 'kyc-submission', 'upload-document');
			return failure(KYC_SUBMISSION_ERROR_CODES.FETCH_FAILED);
		}

		const errorCode = mapKycSubmissionError(error);
		captureServiceError(error, errorCode, {
			service: 'kyc-submission',
			action: 'upload-document',
			submissionId,
		});
		return failure(errorCode);
	}
}
