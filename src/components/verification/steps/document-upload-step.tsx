'use client';

import type { Path, PathValue } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
	Dropzone,
	DropzoneContent,
	DropzoneEmptyState,
} from '@/components/ui/dropzone';
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldSet,
} from '@/components/ui/field';
import {
	ACCEPTED_DOC_TYPES_MAP,
	MAX_DOC_SIZE,
	type VerificationFormData,
} from '@/lib/validation/verification/form-schema';
import { VERIFICATION_TYPE } from '@/types/kyc-submission';

import { useVerificationForm } from '@/components/verification/form/form-provider';

interface DocumentFieldConfig {
	name: Path<VerificationFormData>;
	label: string;
	description: string;
	required: boolean;
}

/**
 * Returns the list of document fields needed based on verification type
 */
function getDocumentFields(
	verificationType: string | null,
): DocumentFieldConfig[] {
	switch (verificationType) {
		case VERIFICATION_TYPE.KYB_INDIVIDUAL:
			return [
				{
					name: 'idFront',
					label: 'ID Document (Front Side)',
					description:
						'Scan or photo of the front of your government-issued ID',
					required: true,
				},
				{
					name: 'idBack',
					label: 'ID Document (Back Side)',
					description: 'Scan or photo of the back of your government-issued ID',
					required: true,
				},
				{
					name: 'proofOfAddress',
					label: 'Proof of Address',
					description:
						'Recent utility bill, bank statement, or government correspondence',
					required: true,
				},
			];
		case VERIFICATION_TYPE.KYB_COMPANY:
			return [
				{
					name: 'companyDocs',
					label: 'Company Documents',
					description:
						'Business registration certificate or certificate of incorporation',
					required: true,
				},
				{
					name: 'proofOfBusinessAddress',
					label: 'Proof of Business Address',
					description:
						'Utility bill, bank statement, or official correspondence showing business address',
					required: true,
				},
			];
		case VERIFICATION_TYPE.KYC_WINNER:
			return [
				{
					name: 'idFront',
					label: 'ID Document (Front Side)',
					description:
						'Scan or photo of the front of your government-issued ID',
					required: true,
				},
				{
					name: 'idBack',
					label: 'ID Document (Back Side)',
					description: 'Scan or photo of the back of your ID (if applicable)',
					required: false,
				},
			];
		default:
			return [];
	}
}

/**
 * DocumentUploadStep Component
 *
 * Renders document upload dropzones based on the selected verification type.
 * Uses the existing Dropzone component with 10MB max and PDF/JPEG/PNG/WebP.
 *
 * @returns Document upload fields for the selected verification type
 */
export function DocumentUploadStep() {
	const { form, verificationType, nextStep } = useVerificationForm();
	const {
		formState: { errors },
		setValue,
		watch,
		trigger,
	} = form;

	const fieldErrors = errors as Record<string, { message?: string }>;
	const documentFields = getDocumentFields(verificationType);

	async function handleNext() {
		// Validate all document fields, not just required ones — ensures invalid
		// files in optional fields (e.g. wrong MIME type on winner's idBack) are
		// caught here instead of only surfacing at final form submission
		const fieldNames = documentFields.map(f => f.name);

		const isValid = await trigger(fieldNames);
		if (isValid) {
			nextStep();
		}
	}

	return (
		<div className="flex flex-col gap-6 pt-6">
			<p className="text-muted-foreground text-sm">
				Upload clear scans or photos of the required documents. Accepted
				formats: PDF, JPEG, PNG, or WebP. Maximum 10MB per file.
			</p>

			<FieldSet>
				<FieldGroup>
					{documentFields.map(field => {
						const files = (watch(field.name) as File[]) || [];

						return (
							<Field key={field.name}>
								<FieldLabel>
									{field.label}
									{!field.required ? (
										<span className="text-muted-foreground font-normal">
											{' '}
											(optional)
										</span>
									) : null}
								</FieldLabel>
								<FieldDescription>{field.description}</FieldDescription>
								<Dropzone
									accept={ACCEPTED_DOC_TYPES_MAP}
									maxFiles={1}
									maxSize={MAX_DOC_SIZE}
									src={files.length > 0 ? files : undefined}
									onDrop={acceptedFiles => {
										// document fields are all File[]-typed; RHF can't narrow PathValue
										// from a generic Path<>, so the cast asserts the known contract.
										setValue(
											field.name,
											acceptedFiles as PathValue<
												VerificationFormData,
												typeof field.name
											>,
											{ shouldValidate: true },
										);
									}}
								>
									<DropzoneContent />
									<DropzoneEmptyState />
								</Dropzone>
								{fieldErrors[field.name] ? (
									<FieldError>{fieldErrors[field.name].message}</FieldError>
								) : null}
							</Field>
						);
					})}
				</FieldGroup>
			</FieldSet>

			<Button type="button" onClick={handleNext} className="mt-2 w-full">
				Review Submission
			</Button>
		</div>
	);
}
