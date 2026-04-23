import { describe, expect, test } from 'bun:test';

import { getIntentErrorMessage } from './intent-errors';

describe('getIntentErrorMessage', () => {
	describe('xshare-specific codes', () => {
		test('already-claimed → consumed wording', () => {
			// Fallback for stale frontend state where the button should
			// have been disabled — guard the legal messaging anyway.
			expect(getIntentErrorMessage('core:xshare:already-claimed')).toBe(
				'Already claimed bonus entry.',
			);
		});

		test('question-required → unlock instructions', () => {
			expect(getIntentErrorMessage('core:xshare:question-required')).toBe(
				'Answer the sweepstakes check-in question first to unlock sharing.',
			);
		});

		test('disabled → feature-off wording', () => {
			expect(getIntentErrorMessage('core:xshare:disabled')).toBe(
				'Bonus-entry sharing is not available for this sweepstakes.',
			);
		});
	});

	describe('raffle state codes', () => {
		test('not-live → no-longer-active wording', () => {
			expect(getIntentErrorMessage('core:raffle:not-live')).toBe(
				'This sweepstakes is no longer active.',
			);
		});

		test('not-found → no-longer-exists wording', () => {
			expect(getIntentErrorMessage('core:raffle:not-found')).toBe(
				'This sweepstakes no longer exists.',
			);
		});
	});

	describe('transport / rate-limit codes', () => {
		test('ratelimit:exceeded → wait wording', () => {
			expect(getIntentErrorMessage('global:ratelimit:exceeded')).toBe(
				'Too many requests — please wait a moment and try again.',
			);
		});

		test('network_error → connection wording', () => {
			expect(getIntentErrorMessage('network_error')).toBe(
				'Network issue — check your connection and try again.',
			);
		});

		test('timeout_error → retry wording', () => {
			expect(getIntentErrorMessage('timeout_error')).toBe(
				'Request timed out — please try again.',
			);
		});
	});

	describe('boundary', () => {
		test('unknown code falls back to generic message', () => {
			// Never leak raw backend slugs to the user — see error-handling.md.
			expect(getIntentErrorMessage('something:unexpected')).toBe(
				'Something went wrong. Please try again.',
			);
		});

		test('empty string also falls back', () => {
			expect(getIntentErrorMessage('')).toBe(
				'Something went wrong. Please try again.',
			);
		});
	});
});
