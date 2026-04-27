import { describe, expect, test } from 'bun:test';

import { getVerifyErrorMessage } from './verify-errors';

describe('getVerifyErrorMessage', () => {
	describe('xshare-specific codes', () => {
		test('expired → restart-the-share wording', () => {
			// Backend rejects pending claims past their `expiresAt` lazily —
			// the user must re-run the intent, so the message points back
			// to the share CTA.
			expect(getVerifyErrorMessage('core:xshare:expired')).toBe(
				'Your share link has expired. Tap "Share on X" to start a new attempt.',
			);
		});

		test('not-found → restart wording', () => {
			// Critical: the orchestrator also uses this code to decide whether
			// to reset state to idle — keep the copy aligned with intent.
			expect(getVerifyErrorMessage('core:xshare:not-found')).toBe(
				'No share claim found. Tap "Share on X" to start.',
			);
		});

		test('disabled → feature-off wording', () => {
			expect(getVerifyErrorMessage('core:xshare:disabled')).toBe(
				'Bonus-entry sharing was turned off for this sweepstakes.',
			);
		});
	});

	describe('raffle state codes', () => {
		test('not-live → no-longer-active wording', () => {
			expect(getVerifyErrorMessage('core:raffle:not-live')).toBe(
				'This sweepstakes is no longer active.',
			);
		});

		test('not-found → no-longer-exists wording', () => {
			expect(getVerifyErrorMessage('core:raffle:not-found')).toBe(
				'This sweepstakes no longer exists.',
			);
		});

		test('sold-out → no-entries wording', () => {
			expect(getVerifyErrorMessage('core:raffle:sold-out')).toBe(
				'This sweepstakes is sold out — no more entries available.',
			);
		});
	});

	describe('transport / rate-limit codes', () => {
		test('ratelimit:exceeded → wait wording', () => {
			expect(getVerifyErrorMessage('global:ratelimit:exceeded')).toBe(
				'Too many requests — please wait a moment and try again.',
			);
		});

		test('network_error → connection wording', () => {
			expect(getVerifyErrorMessage('network_error')).toBe(
				'Network issue — check your connection and try again.',
			);
		});

		test('timeout_error → retry wording', () => {
			expect(getVerifyErrorMessage('timeout_error')).toBe(
				'Request timed out — please try again.',
			);
		});
	});

	describe('boundary', () => {
		test('unknown code falls back to verification-specific generic', () => {
			// Fallback wording differs from the intent fallback — the user
			// should know the failure happened during verification.
			expect(getVerifyErrorMessage('something:unexpected')).toBe(
				'Verification failed. Please try again.',
			);
		});

		test('empty string also falls back', () => {
			expect(getVerifyErrorMessage('')).toBe(
				'Verification failed. Please try again.',
			);
		});
	});
});
