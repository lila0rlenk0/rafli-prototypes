import { describe, expect, test } from 'bun:test';

import {
	getCancelErrorMessage,
	getCancelScheduledChangeOutcome,
	getChangePlanErrorMessage,
	getSubscribeErrorMessage,
} from './error-messages';

// Generic fallback strings — these are what the resolver returns when no
// override + no shared mapping matches the code. Reproducing them here lets us
// assert that specific URNs get specific copy (i.e. NOT one of these).
const SUBSCRIBE_FALLBACK = "We couldn't start checkout. Please try again.";
const CANCEL_FALLBACK =
	"We couldn't cancel your subscription. Please try again.";
const CHANGE_PLAN_FALLBACK = "We couldn't switch your plan. Please try again.";
const CANCEL_SCHEDULED_FALLBACK =
	"We couldn't cancel your scheduled change. Please try again.";

describe('subscription error messages — URN coverage for BE-emitted codes', () => {
	// BE `create-stripe-subscription.command.ts` throws this URN when the
	// Stripe Price ID on the plan row is missing/deleted (test-vs-live key
	// mismatch, stale seed). The user's retry will fail the same way — Ops
	// must fix the seed. Generic "try again" copy is actively misleading.
	test('stripe-price-invalid surfaces actionable copy from the subscribe surface', () => {
		const msg = getSubscribeErrorMessage(
			'payments:subscription:stripe-price-invalid',
		);
		expect(msg).not.toBe(SUBSCRIBE_FALLBACK);
		expect(msg.toLowerCase()).toMatch(/plan|configur|support|temporar/);
	});

	// BE `fanbasis.client.ts` throws this from the subscribe POST path when the
	// upstream Fanbasis API returns 5xx / network / contract drift. The
	// subscribe-to-plan service action surfaces it directly because the error
	// mapper accepts the `payments:fanbasis:` prefix.
	test('fanbasis upstream checkout failure has specific copy on subscribe', () => {
		const msg = getSubscribeErrorMessage('payments:fanbasis:checkout-failed');
		expect(msg).not.toBe(SUBSCRIBE_FALLBACK);
	});

	// BE `fanbasis.client.ts` throws this from the subscribe POST path on
	// Fanbasis 429. Retry-after copy is meaningfully different from generic
	// "try again" — the user needs to wait, not refresh.
	test('fanbasis rate-limit surfaces retry-after copy on subscribe', () => {
		const msg = getSubscribeErrorMessage('payments:fanbasis:rate-limited');
		expect(msg).not.toBe(SUBSCRIBE_FALLBACK);
		expect(msg.toLowerCase()).toMatch(/wait|moment|too many|rate/);
	});

	// Regression guard: the cancel surface owns its own override for the
	// Fanbasis provider-side DELETE failure (distinct from the shared mapping
	// because cancel intent is unambiguous and the copy can be more direct).
	test('cancel surface maps fanbasis cancel-failed', () => {
		const msg = getCancelErrorMessage('payments:fanbasis:cancel-failed');
		expect(msg).not.toBe(CANCEL_FALLBACK);
	});
});

describe('getChangePlanErrorMessage — change-plan URN coverage', () => {
	// BE raises this when the FE submits a change-plan request while a queued
	// downgrade already exists. The CTA gates against `hasPendingChange` so
	// reaching this toast means a stale cache or a second-tab race.
	test('pending-change-exists has actionable copy', () => {
		const msg = getChangePlanErrorMessage(
			'payments:subscription:pending-change-exists',
		);
		expect(msg).not.toBe(CHANGE_PLAN_FALLBACK);
		expect(msg.toLowerCase()).toMatch(/queued|cancel|pending|scheduled/);
	});

	// BE raises this for "same plan" or "upgrade on period_end" — direction
	// logic gates the latter, so this is a stale-catalogue signal in practice.
	test('invalid-plan-change has actionable copy', () => {
		const msg = getChangePlanErrorMessage(
			'payments:subscription:invalid-plan-change',
		);
		expect(msg).not.toBe(CHANGE_PLAN_FALLBACK);
		expect(msg.toLowerCase()).toMatch(/different|another|pick/);
	});

	// CAS race code — retry is the honest UX.
	test('plan-change-conflict suggests retry without alarming', () => {
		const msg = getChangePlanErrorMessage(
			'payments:subscription:plan-change-conflict',
		);
		expect(msg).not.toBe(CHANGE_PLAN_FALLBACK);
		expect(msg.toLowerCase()).toMatch(/try again|retry|changed/);
	});
});

describe('getCancelScheduledChangeOutcome — race classification', () => {
	// Phase[1] auto-applied between render and click — the swap the user
	// queued already happened, so this is a soft-success, not a failure.
	test('pending-change-already-applied → applied (info, not error)', () => {
		const outcome = getCancelScheduledChangeOutcome(
			'payments:subscription:pending-change-already-applied',
		);
		expect(outcome.kind).toBe('applied');
		// Type narrowing: kind === 'applied' implies a `message` field.
		if (outcome.kind === 'applied') {
			expect(outcome.message.toLowerCase()).toMatch(/already|took effect|live/);
		}
	});

	// Nothing queued (another tab cancelled first / schedule auto-expired) —
	// the user's intent is already satisfied, so the UI stays silent.
	test('no-pending-change → noop (silent refetch)', () => {
		const outcome = getCancelScheduledChangeOutcome(
			'payments:subscription:no-pending-change',
		);
		expect(outcome.kind).toBe('noop');
	});

	// Genuine failure routes through the error branch with mapped copy.
	test('unknown URN → error with non-fallback copy when overridden', () => {
		const outcome = getCancelScheduledChangeOutcome(
			'payments:subscription:not-found',
		);
		expect(outcome.kind).toBe('error');
		if (outcome.kind === 'error') {
			expect(outcome.message).not.toBe(CANCEL_SCHEDULED_FALLBACK);
		}
	});

	// Catch-all fallback is reached when no override + no SHARED_MESSAGES
	// mapping resolves the code.
	test('unmapped URN → error with fallback copy', () => {
		const outcome = getCancelScheduledChangeOutcome('unknown_error');
		expect(outcome.kind).toBe('error');
		if (outcome.kind === 'error') {
			expect(outcome.message).toBe(CANCEL_SCHEDULED_FALLBACK);
		}
	});
});
