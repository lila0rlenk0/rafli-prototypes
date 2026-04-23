/** Step titles — order matches step indices 0..3.
 * Extracted to its own file to avoid a circular import between
 * form-header.tsx (defines titles) and `verification-form-defaults.ts`
 * (derives TOTAL_STEPS from the array length). */
export const STEP_TITLES = [
	'Select Verification Type',
	'Personal Information',
	'Upload Documents',
	'Review & Submit',
] as const;
