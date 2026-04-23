'use client';

import { VERIFICATION_TYPE } from '@/types/kyc-submission';

import { CompanyDetailsStep } from '@/components/verification/steps/company-details-step';
import { DocumentUploadStep } from '@/components/verification/steps/document-upload-step';
import { IndividualDetailsStep } from '@/components/verification/steps/individual-details-step';
import { ReviewStep } from '@/components/verification/steps/review-step';
import { TypeSelectionStep } from '@/components/verification/steps/type-selection-step';
import { WinnerDetailsStep } from '@/components/verification/steps/winner-details-step';
import { SuccessScreen } from '@/components/verification/success-screen';
import { useVerificationForm } from './form-provider';

/**
 * FormStepComponent
 *
 * Renders the current step of the verification form based on step index
 * and selected verification type. Shows the success screen when submission
 * is complete.
 *
 * @returns The active form step or success screen
 */
export function FormStepComponent() {
	const { currentStep, verificationType, form, onSubmit, isComplete } =
		useVerificationForm();

	if (isComplete) {
		return <SuccessScreen />;
	}

	const { handleSubmit } = form;

	/**
	 * Returns the correct details step component based on verification type
	 */
	function getDetailsStep() {
		switch (verificationType) {
			case VERIFICATION_TYPE.KYB_INDIVIDUAL:
				return <IndividualDetailsStep />;
			case VERIFICATION_TYPE.KYB_COMPANY:
				return <CompanyDetailsStep />;
			case VERIFICATION_TYPE.KYC_WINNER:
				return <WinnerDetailsStep />;
			default:
				return null;
		}
	}

	/**
	 * Returns the component for the current step index
	 */
	function getStepComponent() {
		switch (currentStep) {
			case 0:
				return <TypeSelectionStep />;
			case 1:
				return getDetailsStep();
			case 2:
				return <DocumentUploadStep />;
			case 3:
				return <ReviewStep />;
			default:
				return null;
		}
	}

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="w-full">
			{getStepComponent()}
		</form>
	);
}
