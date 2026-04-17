'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
	createContext,
	useCallback,
	useContext,
	useState,
	type ReactNode,
} from 'react';
import {
	useForm,
	type DefaultValues,
	type Resolver,
	type UseFormReturn,
} from 'react-hook-form';
import { toast } from 'sonner';

import {
	getSubmissionErrorMessage,
	resolveSubmissionId,
} from '@/lib/verification/submission-recovery';
import { STEP_TITLES } from '@/lib/verification/constants';
import {
	verificationFormSchema,
	type CompanyFormData,
	type IndividualFormData,
	type VerificationFormData,
	type WinnerFormData,
} from '@/lib/validation/verification/verification-form-schema';
import { finalizeSubmission } from '@/services/kyc-submission/finalize-submission';
import { getMySubmissions } from '@/services/kyc-submission/get-my-submissions';
import { submitCompany } from '@/services/kyc-submission/submit-company';
import { submitIndividual } from '@/services/kyc-submission/submit-individual';
import { submitWinner } from '@/services/kyc-submission/submit-winner';
import { uploadDocument } from '@/services/kyc-submission/upload-document';
import {
	DOCUMENT_PURPOSE,
	VERIFICATION_TYPE,
	type VerificationType,
} from '@/types/kyc-submission';

// ─── Submission Phase Tracking ───────────────────────────────────────────────

export const SUBMISSION_PHASE = {
	IDLE: 'idle',
	SUBMITTING: 'submitting',
	UPLOADING: 'uploading',
	FINALIZING: 'finalizing',
	COMPLETE: 'complete',
} as const;

export type SubmissionPhase =
	(typeof SUBMISSION_PHASE)[keyof typeof SUBMISSION_PHASE];

// ─── Context ─────────────────────────────────────────────────────────────────

interface VerificationFormContextType {
	currentStep: number;
	totalSteps: number;
	form: UseFormReturn<VerificationFormData>;
	verificationType: VerificationType | null;
	setVerificationType: (type: VerificationType) => void;
	nextStep: () => void;
	previousStep: () => void;
	isFirstStep: boolean;
	isLastStep: boolean;
	onSubmit: (data: VerificationFormData) => Promise<void>;
	isSubmitting: boolean;
	submissionPhase: SubmissionPhase;
	isComplete: boolean;
}

const VerificationFormContext = createContext<
	VerificationFormContextType | undefined
>(undefined);

// ─── Step Counts ─────────────────────────────────────────────────────────────

/** Derived from STEP_TITLES to prevent drift between title array and step count */
const TOTAL_STEPS = STEP_TITLES.length;

const INITIAL_FORM_VALUES: DefaultValues<VerificationFormData> = {
	verificationType: undefined,
	fullLegalName: '',
	dateOfBirth: '',
	phoneNumber: '',
	residentialAddress: '',
	identityDocType: undefined,
	addressDocType: undefined,
	plannedCategories: [],
	idFront: [],
	idBack: [],
	proofOfAddress: [],
};

function getIndividualDefaults(): DefaultValues<IndividualFormData> {
	return {
		verificationType: VERIFICATION_TYPE.KYB_INDIVIDUAL,
		fullLegalName: '',
		dateOfBirth: '',
		phoneNumber: '',
		residentialAddress: '',
		identityDocType: undefined,
		addressDocType: undefined,
		plannedCategories: [],
		idFront: [],
		idBack: [],
		proofOfAddress: [],
	};
}

function getCompanyDefaults(): DefaultValues<CompanyFormData> {
	return {
		verificationType: VERIFICATION_TYPE.KYB_COMPANY,
		legalEntityName: '',
		businessRegistrationNumber: '',
		countryOfIncorporation: '',
		contactPersonName: '',
		contactEmail: '',
		companyDocs: [],
		proofOfBusinessAddress: [],
	};
}

function getWinnerDefaults(): DefaultValues<WinnerFormData> {
	return {
		verificationType: VERIFICATION_TYPE.KYC_WINNER,
		fullLegalName: '',
		dateOfBirth: '',
		countryOfResidence: '',
		identityDocType: undefined,
		bankAccountOrWallet: '',
		shippingAddress: '',
		idFront: [],
		idBack: [],
	};
}

// ─── Document Extraction ─────────────────────────────────────────────────────

interface DocumentEntry {
	purpose: string;
	file: File;
}

/**
 * Extracts document files from form data based on the verification type
 *
 * @returns Array of purpose-file pairs for sequential upload
 */
function getDocumentsForUpload(data: VerificationFormData): DocumentEntry[] {
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

// ─── Provider ────────────────────────────────────────────────────────────────

interface VerificationFormProviderProps {
	children: ReactNode;
	userEmail: string;
}

/**
 * VerificationFormProvider Component
 *
 * Provides context for the multi-step KYB/KYC verification form.
 * Manages form state, step navigation, and the three-step backend
 * submission flow (submit → upload documents → finalize).
 */
export function VerificationFormProvider({
	children,
	userEmail,
}: VerificationFormProviderProps) {
	const [currentStep, setCurrentStep] = useState(0);
	const [verificationType, setVerificationTypeState] =
		useState<VerificationType | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submissionPhase, setSubmissionPhase] = useState<SubmissionPhase>(
		SUBMISSION_PHASE.IDLE,
	);
	const [isComplete, setIsComplete] = useState(false);

	// zodResolver cast needed: Zod v4 discriminated union output types
	// don't align exactly with react-hook-form's Resolver generics
	const form = useForm<VerificationFormData>({
		resolver: zodResolver(
			verificationFormSchema,
		) as Resolver<VerificationFormData>,
		mode: 'onChange',
		defaultValues: INITIAL_FORM_VALUES,
	});

	/**
	 * Sets the verification type and resets the form with type-appropriate defaults.
	 * Memoized to prevent unnecessary re-renders of context consumers.
	 */
	const setVerificationType = useCallback(
		function setVerificationType(type: VerificationType) {
			setVerificationTypeState(type);

			if (type === VERIFICATION_TYPE.KYB_INDIVIDUAL) {
				form.reset(getIndividualDefaults());
				return;
			}

			if (type === VERIFICATION_TYPE.KYB_COMPANY) {
				form.reset(getCompanyDefaults());
				return;
			}

			form.reset(getWinnerDefaults());
		},
		[form],
	);

	const nextStep = useCallback(() => {
		setCurrentStep(prev => (prev < TOTAL_STEPS - 1 ? prev + 1 : prev));
	}, []);

	const previousStep = useCallback(() => {
		setCurrentStep(prev => (prev > 0 ? prev - 1 : prev));
	}, []);

	const isFirstStep = currentStep === 0;
	const isLastStep = currentStep === TOTAL_STEPS - 1;

	/**
	 * Orchestrates the three-step backend submission:
	 * 1. Submit form data → get submission ID
	 * 2. Upload documents sequentially
	 * 3. Finalize submission
	 */
	const handleCreateSubmission = useCallback(
		async (data: VerificationFormData) => {
			setIsSubmitting(true);
			setSubmissionPhase(SUBMISSION_PHASE.SUBMITTING);

			// Local flag — can't rely on isComplete state in finally because
			// React batches updates and the closure reads the stale value
			let succeeded = false;

			try {
				// Step 1: Submit form data
				let submitResult;

				if (data.verificationType === VERIFICATION_TYPE.KYB_INDIVIDUAL) {
					submitResult = await submitIndividual({
						fullLegalName: data.fullLegalName,
						dateOfBirth: data.dateOfBirth,
						email: userEmail,
						phoneNumber: data.phoneNumber,
						residentialAddress: data.residentialAddress,
						identityDocType: data.identityDocType,
						addressDocType: data.addressDocType,
						plannedCategories: data.plannedCategories,
					});
				} else if (data.verificationType === VERIFICATION_TYPE.KYB_COMPANY) {
					submitResult = await submitCompany({
						legalEntityName: data.legalEntityName,
						businessRegistrationNumber: data.businessRegistrationNumber,
						countryOfIncorporation: data.countryOfIncorporation,
						contactPersonName: data.contactPersonName,
						contactEmail: data.contactEmail,
					});
				} else {
					submitResult = await submitWinner({
						fullLegalName: data.fullLegalName,
						dateOfBirth: data.dateOfBirth,
						countryOfResidence: data.countryOfResidence,
						identityDocType: data.identityDocType,
						bankAccountOrWallet: data.bankAccountOrWallet || null,
						shippingAddress: data.shippingAddress || null,
					});
				}

				const submissionIdResult = await resolveSubmissionId({
					submitResult,
					verificationType: data.verificationType,
					getMySubmissionsFn: getMySubmissions,
				});
				if (!submissionIdResult.success) {
					toast.error(getSubmissionErrorMessage(submissionIdResult.errorCode));
					return;
				}
				const submissionId = submissionIdResult.submissionId;
				if (submissionIdResult.resumedFromExistingDraft) {
					toast.info(
						'Resuming your existing draft submission and continuing document upload.',
					);
				}

				// Step 2: Upload documents
				setSubmissionPhase(SUBMISSION_PHASE.UPLOADING);
				const documents = getDocumentsForUpload(data);

				for (const { purpose, file } of documents) {
					const uploadResult = await uploadDocument(
						submissionId,
						purpose,
						file,
					);
					if (!uploadResult.success) {
						toast.error(getSubmissionErrorMessage(uploadResult.error));
						return;
					}
				}

				// Step 3: Finalize
				setSubmissionPhase(SUBMISSION_PHASE.FINALIZING);
				const finalizeResult = await finalizeSubmission(submissionId);

				if (!finalizeResult.success) {
					toast.error(getSubmissionErrorMessage(finalizeResult.error));
					return;
				}

				setSubmissionPhase(SUBMISSION_PHASE.COMPLETE);
				setIsComplete(true);
				succeeded = true;
			} catch (error) {
				console.error('Verification submission error:', error);
				toast.error('Something went wrong. Please try again.');
			} finally {
				setIsSubmitting(false);
				// Reset phase to IDLE on failure so the header stops
				// showing "Uploading documents..." after an error
				if (!succeeded) {
					setSubmissionPhase(SUBMISSION_PHASE.IDLE);
				}
			}
		},
		[userEmail],
	);

	/**
	 * Handles form submission — advances step or submits on last step
	 */
	const handleSubmit = useCallback(
		async (data: VerificationFormData) => {
			if (isLastStep) {
				await handleCreateSubmission(data);
			} else {
				nextStep();
			}
		},
		[isLastStep, handleCreateSubmission, nextStep],
	);

	return (
		<VerificationFormContext.Provider
			value={{
				currentStep,
				totalSteps: TOTAL_STEPS,
				form,
				verificationType,
				setVerificationType,
				nextStep,
				previousStep,
				isFirstStep,
				isLastStep,
				onSubmit: handleSubmit,
				isSubmitting,
				submissionPhase,
				isComplete,
			}}
		>
			{children}
		</VerificationFormContext.Provider>
	);
}

/**
 * Hook to access the verification form context.
 * Must be used within a VerificationFormProvider.
 *
 * @returns The verification form context
 * @throws Error if used outside of VerificationFormProvider
 */
export function useVerificationForm() {
	const context = useContext(VerificationFormContext);
	if (!context) {
		throw new Error(
			'useVerificationForm must be used within VerificationFormProvider',
		);
	}
	return context;
}
