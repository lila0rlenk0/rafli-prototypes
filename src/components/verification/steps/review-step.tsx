'use client';

import { FileText } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { ReviewRow } from '@/components/ui/data-review/review-row';
import { ReviewSection } from '@/components/ui/data-review/review-section';
import {
	ADDRESS_DOC_LABELS,
	CATEGORY_LABELS,
	ID_TYPE_LABELS,
	VERIFICATION_TYPE_LABELS,
} from '@/lib/verification/labels';
import type { VerificationFormData } from '@/lib/validation/verification/form-schema';
import { VERIFICATION_TYPE } from '@/types/kyc-submission';

import { useVerificationForm } from '@/components/verification/form/form-provider';

/**
 * ReviewStep Component
 *
 * Displays a read-only summary of all entered data and uploaded documents.
 * Submit triggers the three-step backend submission flow in the provider.
 *
 * @returns Summary view with submit button.
 */
export function ReviewStep() {
	const { form, verificationType, isSubmitting } = useVerificationForm();
	const values = form.getValues();

	return (
		<div className="flex flex-col gap-4 pt-6">
			<ReviewSection title="Verification Type">
				<ReviewRow label="Type">
					{verificationType
						? VERIFICATION_TYPE_LABELS[verificationType]
						: 'Not selected'}
				</ReviewRow>
			</ReviewSection>

			<TypeSpecificReview values={values} />

			<p className="text-muted-foreground mt-2 text-center text-xs">
				By submitting, you confirm that all information provided is accurate and
				the documents are genuine.
			</p>

			<Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
				{isSubmitting ? 'Submitting...' : 'Submit Verification'}
			</Button>
		</div>
	);
}

interface TypeSpecificReviewProps {
	values: VerificationFormData;
}

/**
 * Dispatches to the per-type review group via an exhaustive switch — ensures
 * a new `VerificationType` literal fails to compile until handled here.
 */
function TypeSpecificReview({ values }: TypeSpecificReviewProps) {
	switch (values.verificationType) {
		case VERIFICATION_TYPE.KYB_INDIVIDUAL:
			return <IndividualReview values={values} />;
		case VERIFICATION_TYPE.KYB_COMPANY:
			return <CompanyReview values={values} />;
		case VERIFICATION_TYPE.KYC_WINNER:
			return <WinnerReview values={values} />;
		default: {
			const never_: never = values;
			return never_;
		}
	}
}

interface IndividualReviewProps {
	values: Extract<
		VerificationFormData,
		{ verificationType: typeof VERIFICATION_TYPE.KYB_INDIVIDUAL }
	>;
}

/** Personal + document summary for KYB individual hosts. */
function IndividualReview({ values }: IndividualReviewProps) {
	return (
		<>
			<ReviewSection title="Personal Information">
				<ReviewRow label="Full Legal Name">{values.fullLegalName}</ReviewRow>
				<ReviewRow label="Date of Birth">{values.dateOfBirth}</ReviewRow>
				<ReviewRow label="Phone Number">{values.phoneNumber}</ReviewRow>
				<ReviewRow label="Residential Address">
					{values.residentialAddress}
				</ReviewRow>
				<ReviewRow label="Identity Document">
					{ID_TYPE_LABELS[values.identityDocType]}
				</ReviewRow>
				<ReviewRow label="Address Document">
					{ADDRESS_DOC_LABELS[values.addressDocType]}
				</ReviewRow>
				<ReviewRow label="Planned Categories">
					<CategoryChips categories={values.plannedCategories} />
				</ReviewRow>
			</ReviewSection>

			<ReviewSection title="Documents">
				<DocumentLine label="ID Front" files={values.idFront} />
				<DocumentLine label="ID Back" files={values.idBack} />
				<DocumentLine label="Proof of Address" files={values.proofOfAddress} />
			</ReviewSection>
		</>
	);
}

interface CompanyReviewProps {
	values: Extract<
		VerificationFormData,
		{ verificationType: typeof VERIFICATION_TYPE.KYB_COMPANY }
	>;
}

/** Company-details + document summary for KYB company hosts. */
function CompanyReview({ values }: CompanyReviewProps) {
	return (
		<>
			<ReviewSection title="Company Information">
				<ReviewRow label="Legal Entity Name">
					{values.legalEntityName}
				</ReviewRow>
				<ReviewRow label="Registration Number">
					{values.businessRegistrationNumber}
				</ReviewRow>
				<ReviewRow label="Country of Incorporation">
					{values.countryOfIncorporation}
				</ReviewRow>
				<ReviewRow label="Contact Person">{values.contactPersonName}</ReviewRow>
				<ReviewRow label="Contact Email">{values.contactEmail}</ReviewRow>
			</ReviewSection>

			<ReviewSection title="Documents">
				<DocumentLine label="Company Documents" files={values.companyDocs} />
				<DocumentLine
					label="Proof of Business Address"
					files={values.proofOfBusinessAddress}
				/>
			</ReviewSection>
		</>
	);
}

interface WinnerReviewProps {
	values: Extract<
		VerificationFormData,
		{ verificationType: typeof VERIFICATION_TYPE.KYC_WINNER }
	>;
}

/** Personal + shipping + document summary for KYC winners. */
function WinnerReview({ values }: WinnerReviewProps) {
	const hasBankOrWallet = values.bankAccountOrWallet !== '';
	return (
		<>
			<ReviewSection title="Personal Information">
				<ReviewRow label="Full Legal Name">{values.fullLegalName}</ReviewRow>
				<ReviewRow label="Date of Birth">{values.dateOfBirth}</ReviewRow>
				<ReviewRow label="Country of Residence">
					{values.countryOfResidence}
				</ReviewRow>
				<ReviewRow label="Identity Document">
					{ID_TYPE_LABELS[values.identityDocType]}
				</ReviewRow>
				{hasBankOrWallet ? (
					<ReviewRow label="Bank Account / Wallet">
						{values.bankAccountOrWallet}
					</ReviewRow>
				) : null}
				<ShippingReviewRows values={values} />
			</ReviewSection>

			<ReviewSection title="Documents">
				<DocumentLine label="ID Front" files={values.idFront} />
				{values.idBack.length > 0 ? (
					<DocumentLine label="ID Back" files={values.idBack} />
				) : null}
			</ReviewSection>
		</>
	);
}

/** Shipping sub-rows — always rendered because the schema requires them. */
function ShippingReviewRows({ values }: WinnerReviewProps) {
	const hasPhone = values.shippingPhone !== '';
	return (
		<>
			<ReviewRow label="Shipping Recipient">{values.shippingName}</ReviewRow>
			<ReviewRow label="Shipping Street">{values.shippingStreet}</ReviewRow>
			<ReviewRow label="Shipping City">{values.shippingCity}</ReviewRow>
			<ReviewRow label="Shipping Postal Code">{values.shippingZip}</ReviewRow>
			<ReviewRow label="Shipping Country">{values.shippingCountry}</ReviewRow>
			{hasPhone ? (
				<ReviewRow label="Shipping Phone">{values.shippingPhone}</ReviewRow>
			) : null}
		</>
	);
}

interface CategoryChipsProps {
	categories: readonly string[];
}

/** Compact chip row rendered as the value slot inside a ReviewRow. */
function CategoryChips({ categories }: CategoryChipsProps): ReactNode {
	return (
		<span className="flex flex-wrap gap-1.5">
			{categories.map(function renderChip(cat) {
				return (
					<span key={cat} className="rounded-full border px-2.5 py-0.5 text-xs">
						{CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS] ?? cat}
					</span>
				);
			})}
		</span>
	);
}

interface DocumentLineProps {
	label: string;
	files: readonly File[];
}

/** Document-row renderer — shows the first uploaded file's name beside its label. */
function DocumentLine({ label, files }: DocumentLineProps) {
	if (files.length === 0) return null;
	return (
		<ReviewRow label={label}>
			<span className="flex items-center gap-2">
				<FileText
					className="text-muted-foreground size-4 shrink-0"
					aria-hidden="true"
				/>
				<span className="truncate">{files[0].name}</span>
			</span>
		</ReviewRow>
	);
}
