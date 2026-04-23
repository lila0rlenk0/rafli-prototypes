export const SUBMISSION_PHASE = {
	IDLE: 'idle',
	SUBMITTING: 'submitting',
	UPLOADING: 'uploading',
	FINALIZING: 'finalizing',
	COMPLETE: 'complete',
} as const;

export type SubmissionPhase =
	(typeof SUBMISSION_PHASE)[keyof typeof SUBMISSION_PHASE];
