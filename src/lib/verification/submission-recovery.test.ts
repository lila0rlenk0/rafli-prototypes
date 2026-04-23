import { describe, expect, test } from 'bun:test';

import { VERIFICATION_TYPE } from '@/types/kyc-submission';
import {
	getSubmissionErrorMessage,
	resolveSubmissionId,
} from '@/lib/verification/submission-recovery';

describe('resolveSubmissionId', () => {
	test('uses fresh submission id when submit succeeds', async () => {
		const result = await resolveSubmissionId({
			submitResult: {
				success: true,
				data: {
					id: 'new-submission-id',
					status: 'pending',
					submittedAt: '2026-04-03T00:00:00.000Z',
					type: VERIFICATION_TYPE.KYB_INDIVIDUAL,
				},
			},
			verificationType: VERIFICATION_TYPE.KYB_INDIVIDUAL,
			getMySubmissionsFn: async () => ({
				success: true,
				data: { submissions: [] },
			}),
		});

		expect(result).toEqual({
			success: true,
			submissionId: 'new-submission-id',
			resumedFromExistingDraft: false,
		});
	});

	test('recovers an existing pending submission id when submit returns already-pending', async () => {
		const result = await resolveSubmissionId({
			submitResult: {
				success: false,
				error: 'core:verification:already-pending',
			},
			verificationType: VERIFICATION_TYPE.KYB_INDIVIDUAL,
			getMySubmissionsFn: async () => ({
				success: true,
				data: {
					submissions: [
						{
							id: 'existing-pending-id',
							type: VERIFICATION_TYPE.KYB_INDIVIDUAL,
							status: 'pending',
							submittedAt: '2026-04-03T00:00:00.000Z',
						},
					],
				},
			}),
		});

		expect(result).toEqual({
			success: true,
			submissionId: 'existing-pending-id',
			resumedFromExistingDraft: true,
		});
	});

	test('fails with the original error when submit fails with a non-recoverable code', async () => {
		// Recovery path only kicks in for "already-pending". Any other error
		// code must surface untouched so the UI can show the specific reason.
		let listCalls = 0;
		const result = await resolveSubmissionId({
			submitResult: {
				success: false,
				error: 'core:verification:email-mismatch',
			},
			verificationType: VERIFICATION_TYPE.KYB_INDIVIDUAL,
			getMySubmissionsFn: async () => {
				listCalls += 1;
				return { success: true, data: { submissions: [] } };
			},
		});

		expect(result).toEqual({
			success: false,
			errorCode: 'core:verification:email-mismatch',
		});
		// Lookup must be skipped — no reason to burn an API call when the
		// original error is already terminal.
		expect(listCalls).toBe(0);
	});

	test('falls back to the original error when list-submissions itself fails', async () => {
		// Recovery fetch can fail independently. Surface the original submit
		// error (not the list error) so copy stays consistent for the user.
		const result = await resolveSubmissionId({
			submitResult: {
				success: false,
				error: 'core:verification:already-pending',
			},
			verificationType: VERIFICATION_TYPE.KYB_INDIVIDUAL,
			getMySubmissionsFn: async () => ({
				success: false,
				error: 'network_error',
			}),
		});

		expect(result).toEqual({
			success: false,
			errorCode: 'core:verification:already-pending',
		});
	});

	test('fails with already-pending when no pending submission exists to recover', async () => {
		const result = await resolveSubmissionId({
			submitResult: {
				success: false,
				error: 'core:verification:already-pending',
			},
			verificationType: VERIFICATION_TYPE.KYB_COMPANY,
			getMySubmissionsFn: async () => ({
				success: true,
				data: {
					submissions: [
						{
							id: 'rejected-id',
							type: VERIFICATION_TYPE.KYB_COMPANY,
							status: 'rejected',
							submittedAt: '2026-04-03T00:00:00.000Z',
						},
					],
				},
			}),
		});

		expect(result).toEqual({
			success: false,
			errorCode: 'core:verification:already-pending',
		});
	});
});

describe('getSubmissionErrorMessage', () => {
	test('maps upload precondition errors with actionable text', () => {
		expect(
			getSubmissionErrorMessage('core:verification:not-pending'),
		).toContain('draft state');
		expect(
			getSubmissionErrorMessage('core:verification:permission-denied'),
		).toContain('permission');
		expect(
			getSubmissionErrorMessage('core:verification:invalid-purpose'),
		).toContain('invalid purpose');
	});

	test('maps global upload guard errors to file-focused messages', () => {
		expect(getSubmissionErrorMessage('global:upload:file-too-large')).toContain(
			'10MB',
		);
		expect(
			getSubmissionErrorMessage('global:upload:invalid-file-type'),
		).toContain('PDF');
	});

	test('falls back to generic copy for unknown error codes', () => {
		// Defensive branch — any future BE code the FE hasn't mapped yet
		// must surface as a generic toast rather than leaking the raw code.
		expect(getSubmissionErrorMessage('core:verification:unmapped-code')).toBe(
			'Something went wrong. Please try again.',
		);
		expect(getSubmissionErrorMessage('')).toBe(
			'Something went wrong. Please try again.',
		);
	});
});
