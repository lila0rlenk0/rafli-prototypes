'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
	createContext,
	useCallback,
	useContext,
	useState,
	type ReactNode,
} from 'react';
import { useForm, type Resolver, type UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';

import {
	getCompanyDefaults,
	getIndividualDefaults,
	getWinnerDefaults,
	INITIAL_FORM_VALUES,
	TOTAL_STEPS,
} from '@/components/verification/form/verification-form-defaults';
import {
	SUBMISSION_PHASE,
	type SubmissionPhase,
} from '@/components/verification/form/verification-form-submission-phase';
import {
	getDocumentsForUpload,
	submitVerificationByType,
} from '@/components/verification/form/verification-form-submit-payload';
import {
	getSubmissionErrorMessage,
	resolveSubmissionId,
} from '@/lib/verification/submission-recovery';
import {
	verificationFormSchema,
	type VerificationFormData,
} from '@/lib/validation/verification/form-schema';
import { finalizeSubmission } from '@/services/kyc-submission/finalize-submission';
import { getMySubmissions } from '@/services/kyc-submission/get-my-submissions';
import { uploadDocument } from '@/services/kyc-submission/upload-document';
import {
	VERIFICATION_TYPE,
	type VerificationType,
} from '@/types/kyc-submission';

export { SUBMISSION_PHASE, type SubmissionPhase };

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
				// Step 1: Submit form data via the type-specific endpoint.
				const submitResult = await submitVerificationByType(data, userEmail);

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
