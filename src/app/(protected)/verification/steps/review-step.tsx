'use client';

import { Button } from '@/components/ui/button';
import { VERIFICATION_TYPE } from '@/types/kyc-submission';
import { FileText } from 'lucide-react';
import {
	ADDRESS_DOC_LABELS,
	CATEGORY_LABELS,
	ID_TYPE_LABELS,
	VERIFICATION_TYPE_LABELS,
} from '../labels';
import { useVerificationForm } from '../verification-form-provider';

// ─── Review Row Component ────────────────────────────────────────────────────

interface ReviewRowProps {
	label: string;
	value: string | undefined;
}

function ReviewRow({ label, value }: ReviewRowProps) {
	if (!value) return null;

	return (
		<div className="flex flex-col gap-0.5">
			<span className="text-muted-foreground text-xs">{label}</span>
			<span className="text-sm">{value}</span>
		</div>
	);
}

interface DocumentRowProps {
	label: string;
	files: File[];
}

function DocumentRow({ label, files }: DocumentRowProps) {
	if (files.length === 0) return null;

	return (
		<div className="flex items-center gap-2">
			<FileText className="text-muted-foreground size-4 shrink-0" />
			<span className="text-muted-foreground text-xs">{label}:</span>
			<span className="truncate text-sm">{files[0].name}</span>
		</div>
	);
}

// ─── Review Step ─────────────────────────────────────────────────────────────

/**
 * ReviewStep Component
 *
 * Displays a read-only summary of all entered data and uploaded documents.
 * Submit button triggers the three-step backend submission flow.
 *
 * @returns Summary view with submit button
 */
export function ReviewStep() {
	const { form, verificationType, isSubmitting } = useVerificationForm();
	const values = form.getValues();

	/**
	 * Renders individual-specific review fields
	 */
	function renderIndividualReview() {
		if (values.verificationType !== VERIFICATION_TYPE.KYB_INDIVIDUAL) {
			return null;
		}

		return (
			<>
				<div className="flex flex-col gap-3 rounded-xl border p-5">
					<h3 className="text-sm font-semibold">Personal Information</h3>
					<ReviewRow label="Full Legal Name" value={values.fullLegalName} />
					<ReviewRow label="Date of Birth" value={values.dateOfBirth} />
					<ReviewRow label="Phone Number" value={values.phoneNumber} />
					<ReviewRow
						label="Residential Address"
						value={values.residentialAddress}
					/>
					<ReviewRow
						label="Identity Document"
						value={ID_TYPE_LABELS[values.identityDocType]}
					/>
					<ReviewRow
						label="Address Document"
						value={ADDRESS_DOC_LABELS[values.addressDocType]}
					/>
					<div className="flex flex-col gap-0.5">
						<span className="text-muted-foreground text-xs">
							Planned Categories
						</span>
						<div className="flex flex-wrap gap-1.5">
							{values.plannedCategories.map(cat => (
								<span
									key={cat}
									className="rounded-full border px-2.5 py-0.5 text-xs"
								>
									{CATEGORY_LABELS[cat] ?? cat}
								</span>
							))}
						</div>
					</div>
				</div>

				<div className="flex flex-col gap-3 rounded-xl border p-5">
					<h3 className="text-sm font-semibold">Documents</h3>
					<DocumentRow label="ID Front" files={values.idFront} />
					<DocumentRow label="ID Back" files={values.idBack} />
					<DocumentRow label="Proof of Address" files={values.proofOfAddress} />
				</div>
			</>
		);
	}

	/**
	 * Renders company-specific review fields
	 */
	function renderCompanyReview() {
		if (values.verificationType !== VERIFICATION_TYPE.KYB_COMPANY) {
			return null;
		}

		return (
			<>
				<div className="flex flex-col gap-3 rounded-xl border p-5">
					<h3 className="text-sm font-semibold">Company Information</h3>
					<ReviewRow label="Legal Entity Name" value={values.legalEntityName} />
					<ReviewRow
						label="Registration Number"
						value={values.businessRegistrationNumber}
					/>
					<ReviewRow
						label="Country of Incorporation"
						value={values.countryOfIncorporation}
					/>
					<ReviewRow label="Contact Person" value={values.contactPersonName} />
					<ReviewRow label="Contact Email" value={values.contactEmail} />
				</div>

				<div className="flex flex-col gap-3 rounded-xl border p-5">
					<h3 className="text-sm font-semibold">Documents</h3>
					<DocumentRow label="Company Documents" files={values.companyDocs} />
					<DocumentRow
						label="Proof of Business Address"
						files={values.proofOfBusinessAddress}
					/>
				</div>
			</>
		);
	}

	/**
	 * Renders winner-specific review fields
	 */
	function renderWinnerReview() {
		if (values.verificationType !== VERIFICATION_TYPE.KYC_WINNER) {
			return null;
		}

		return (
			<>
				<div className="flex flex-col gap-3 rounded-xl border p-5">
					<h3 className="text-sm font-semibold">Personal Information</h3>
					<ReviewRow label="Full Legal Name" value={values.fullLegalName} />
					<ReviewRow label="Date of Birth" value={values.dateOfBirth} />
					<ReviewRow
						label="Country of Residence"
						value={values.countryOfResidence}
					/>
					<ReviewRow
						label="Identity Document"
						value={ID_TYPE_LABELS[values.identityDocType]}
					/>
					{values.bankAccountOrWallet ? (
						<ReviewRow
							label="Bank Account / Wallet"
							value={values.bankAccountOrWallet}
						/>
					) : null}
					{values.shippingAddress ? (
						<ReviewRow
							label="Shipping Address"
							value={values.shippingAddress}
						/>
					) : null}
				</div>

				<div className="flex flex-col gap-3 rounded-xl border p-5">
					<h3 className="text-sm font-semibold">Documents</h3>
					<DocumentRow label="ID Front" files={values.idFront} />
					{values.idBack && values.idBack.length > 0 ? (
						<DocumentRow label="ID Back" files={values.idBack} />
					) : null}
				</div>
			</>
		);
	}

	return (
		<div className="flex flex-col gap-4 pt-6">
			<div className="flex flex-col gap-3 rounded-xl border border-dashed p-5">
				<h3 className="text-sm font-semibold">Verification Type</h3>
				<span className="text-sm">
					{verificationType
						? VERIFICATION_TYPE_LABELS[verificationType]
						: 'Not selected'}
				</span>
			</div>

			{renderIndividualReview()}
			{renderCompanyReview()}
			{renderWinnerReview()}

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
