import { describe, expect, test } from 'bun:test';

import { VERIFICATION_TYPE } from '@/types/kyc-submission';

import {
	getSubmissionErrorMessage,
	resolveSubmissionId,
} from './submission-recovery';

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
});
