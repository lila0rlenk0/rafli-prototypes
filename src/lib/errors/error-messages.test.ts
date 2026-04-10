import { describe, expect, test } from 'bun:test';

import {
	COMMENT_ERROR_CODES,
	COMMON_ERROR_CODES,
	REPORT_ERROR_CODES,
} from '@/types/errors';

import { getReportErrorMessage, getVoteErrorMessage } from './error-messages';

// ==========================================
// getVoteErrorMessage
// ==========================================
//
// Pure code→message mapper used by the vote mutation's onError handler.
// Every branch asserted explicitly so a missing case falls into `default`
// and fails loudly instead of silently rendering the generic toast.

describe('getVoteErrorMessage', () => {
	describe('comment-domain branches', () => {
		test('SELF_VOTE → self-vote guidance', () => {
			expect(getVoteErrorMessage(COMMENT_ERROR_CODES.SELF_VOTE)).toBe(
				"You can't vote on your own comment.",
			);
		});

		test('NOT_FOUND → comment not found', () => {
			expect(getVoteErrorMessage(COMMENT_ERROR_CODES.NOT_FOUND)).toBe(
				'Comment not found.',
			);
		});

		test('DELETED → comment deleted', () => {
			expect(getVoteErrorMessage(COMMENT_ERROR_CODES.DELETED)).toBe(
				'This comment has been deleted.',
			);
		});

		test('RAFFLE_NOT_COMMENTABLE → raffle lock copy', () => {
			expect(
				getVoteErrorMessage(COMMENT_ERROR_CODES.RAFFLE_NOT_COMMENTABLE),
			).toBe('Voting is no longer available for this raffle.');
		});
	});

	describe('common-error branches (bleed-through from mapCommentError)', () => {
		test('NETWORK_ERROR → network copy', () => {
			expect(getVoteErrorMessage(COMMON_ERROR_CODES.NETWORK_ERROR)).toBe(
				'Network error. Please check your connection.',
			);
		});

		test('TIMEOUT_ERROR → timeout copy', () => {
			expect(getVoteErrorMessage(COMMON_ERROR_CODES.TIMEOUT_ERROR)).toBe(
				'Request timed out. Please try again.',
			);
		});

		test('UNAUTHORIZED → sign-in prompt', () => {
			expect(getVoteErrorMessage(COMMON_ERROR_CODES.UNAUTHORIZED)).toBe(
				'Please sign in to vote.',
			);
		});
	});

	describe('default fallback', () => {
		test('unmapped comment code falls through to generic copy', () => {
			// PERMISSION_DENIED is a valid comment code but not switched in the
			// vote-specific message map — should hit the default branch so stale
			// error codes surface as the generic toast rather than blowing up.
			expect(getVoteErrorMessage(COMMENT_ERROR_CODES.PERMISSION_DENIED)).toBe(
				'Failed to vote. Please try again.',
			);
		});

		test('unmapped common code falls through to generic copy', () => {
			expect(
				getVoteErrorMessage(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR),
			).toBe('Failed to vote. Please try again.');
		});
	});
});

// ==========================================
// getReportErrorMessage
// ==========================================

describe('getReportErrorMessage', () => {
	describe('report-domain branches', () => {
		test('DUPLICATE → already-reported copy', () => {
			expect(getReportErrorMessage(REPORT_ERROR_CODES.DUPLICATE)).toBe(
				'You have already reported this content.',
			);
		});

		test('RAFFLE_ID_REQUIRED → missing raffle context', () => {
			expect(getReportErrorMessage(REPORT_ERROR_CODES.RAFFLE_ID_REQUIRED)).toBe(
				'Could not identify the raffle for this report.',
			);
		});

		test('RAFFLE_ID_MISMATCH → refresh guidance', () => {
			expect(getReportErrorMessage(REPORT_ERROR_CODES.RAFFLE_ID_MISMATCH)).toBe(
				'Report context mismatch. Please refresh and try again.',
			);
		});

		test('VALIDATION_FAILED → check reason copy', () => {
			expect(getReportErrorMessage(REPORT_ERROR_CODES.VALIDATION_FAILED)).toBe(
				'Please check your report reason and try again.',
			);
		});
	});

	describe('common-error branches', () => {
		test('NETWORK_ERROR → network copy', () => {
			expect(getReportErrorMessage(COMMON_ERROR_CODES.NETWORK_ERROR)).toBe(
				'Network error. Please check your connection.',
			);
		});

		test('TIMEOUT_ERROR → timeout copy', () => {
			expect(getReportErrorMessage(COMMON_ERROR_CODES.TIMEOUT_ERROR)).toBe(
				'Request timed out. Please try again.',
			);
		});

		test('UNAUTHORIZED → sign-in prompt', () => {
			expect(getReportErrorMessage(COMMON_ERROR_CODES.UNAUTHORIZED)).toBe(
				'Please sign in to report content.',
			);
		});
	});

	describe('default fallback', () => {
		test('unmapped common code falls through to generic copy', () => {
			expect(
				getReportErrorMessage(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR),
			).toBe('Failed to submit report. Please try again.');
		});
	});
});
