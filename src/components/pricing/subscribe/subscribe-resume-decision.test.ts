import { describe, expect, test } from 'bun:test';

import { SUBSCRIPTION_PROVIDER } from '@/types/subscription';

import { getSubscribeResumeDecision } from './subscribe-resume-decision';

const AUTHED = true;
const GUEST = false;
const NOT_DISPATCHED = false;
const DISPATCHED = true;

// Shared catalogue fixture — two plans, each with a different rail availability
// so we can exercise the intersection logic against the viewer's lock.
const PLAN_PROVIDERS_BY_ID = {
	plan_pro: [SUBSCRIPTION_PROVIDER.STRIPE, SUBSCRIPTION_PROVIDER.FANBASIS],
	plan_starter: [SUBSCRIPTION_PROVIDER.STRIPE],
	plan_fan_only: [SUBSCRIPTION_PROVIDER.FANBASIS],
} as const;

describe('getSubscribeResumeDecision', () => {
	describe('dispatch path', () => {
		test('dispatches with the lock when the plan offers it', () => {
			// Returning Stripe buyer hits ?plan=plan_pro after sign-in — the
			// trigger fires once with Stripe (their locked rail).
			expect(
				getSubscribeResumeDecision({
					isAuthenticated: AUTHED,
					planParam: 'plan_pro',
					alreadyDispatched: NOT_DISPATCHED,
					planProvidersById: PLAN_PROVIDERS_BY_ID,
					lockedProvider: SUBSCRIPTION_PROVIDER.STRIPE,
				}),
			).toEqual({
				kind: 'dispatch',
				planId: 'plan_pro',
				provider: SUBSCRIPTION_PROVIDER.STRIPE,
			});
		});

		test('falls back to Stripe when the viewer has no lock yet', () => {
			// First-time buyer with both rails offered defaults to Stripe per the
			// `pickSubscribeProvider` precedence rule.
			expect(
				getSubscribeResumeDecision({
					isAuthenticated: AUTHED,
					planParam: 'plan_pro',
					alreadyDispatched: NOT_DISPATCHED,
					planProvidersById: PLAN_PROVIDERS_BY_ID,
					lockedProvider: null,
				}),
			).toEqual({
				kind: 'dispatch',
				planId: 'plan_pro',
				provider: SUBSCRIPTION_PROVIDER.STRIPE,
			});
		});

		test('falls back to Fanbasis when the plan is Fanbasis-only and no lock', () => {
			expect(
				getSubscribeResumeDecision({
					isAuthenticated: AUTHED,
					planParam: 'plan_fan_only',
					alreadyDispatched: NOT_DISPATCHED,
					planProvidersById: PLAN_PROVIDERS_BY_ID,
					lockedProvider: null,
				}),
			).toEqual({
				kind: 'dispatch',
				planId: 'plan_fan_only',
				provider: SUBSCRIPTION_PROVIDER.FANBASIS,
			});
		});

		test('trims surrounding whitespace in the plan id before dispatching', () => {
			// URL encoders occasionally emit a leading/trailing space on round-trip
			// through sign-in; we shouldn't fail closed on harmless whitespace.
			expect(
				getSubscribeResumeDecision({
					isAuthenticated: AUTHED,
					planParam: '  plan_starter  ',
					alreadyDispatched: NOT_DISPATCHED,
					planProvidersById: PLAN_PROVIDERS_BY_ID,
					lockedProvider: SUBSCRIPTION_PROVIDER.STRIPE,
				}),
			).toEqual({
				kind: 'dispatch',
				planId: 'plan_starter',
				provider: SUBSCRIPTION_PROVIDER.STRIPE,
			});
		});
	});

	describe('unavailable path', () => {
		test('flags an unknown plan id as unavailable', () => {
			// Ops disabled a plan after the user copied the URL — the catalogue
			// lookup misses, so we toast + scrub instead of firing a
			// guaranteed-to-fail `plan-not-found` to the BE.
			expect(
				getSubscribeResumeDecision({
					isAuthenticated: AUTHED,
					planParam: 'plan_disabled',
					alreadyDispatched: NOT_DISPATCHED,
					planProvidersById: PLAN_PROVIDERS_BY_ID,
					lockedProvider: SUBSCRIPTION_PROVIDER.STRIPE,
				}),
			).toEqual({ kind: 'unavailable', planId: 'plan_disabled' });
		});

		test('flags a known plan that is not offered on the locked rail', () => {
			// Fanbasis-locked buyer landing on a Stripe-only plan — BE would
			// reject with `provider-locked`; the FE pre-empts the failure.
			expect(
				getSubscribeResumeDecision({
					isAuthenticated: AUTHED,
					planParam: 'plan_starter',
					alreadyDispatched: NOT_DISPATCHED,
					planProvidersById: PLAN_PROVIDERS_BY_ID,
					lockedProvider: SUBSCRIPTION_PROVIDER.FANBASIS,
				}),
			).toEqual({ kind: 'unavailable', planId: 'plan_starter' });
		});
	});

	describe('skip path', () => {
		test('skips guests even when a plan param is present', () => {
			// A guest with ?plan= would just bounce back through sign-in; the
			// dispatch would create an infinite resume loop.
			expect(
				getSubscribeResumeDecision({
					isAuthenticated: GUEST,
					planParam: 'plan_pro',
					alreadyDispatched: NOT_DISPATCHED,
					planProvidersById: PLAN_PROVIDERS_BY_ID,
					lockedProvider: SUBSCRIPTION_PROVIDER.STRIPE,
				}),
			).toEqual({ kind: 'skip' });
		});

		test('skips when no plan param is present (the 99% normal-landing case)', () => {
			expect(
				getSubscribeResumeDecision({
					isAuthenticated: AUTHED,
					planParam: null,
					alreadyDispatched: NOT_DISPATCHED,
					planProvidersById: PLAN_PROVIDERS_BY_ID,
					lockedProvider: null,
				}),
			).toEqual({ kind: 'skip' });
		});

		test('skips empty-string plan param', () => {
			// `?plan=` with no value parses to '' in URLSearchParams — must not
			// fire a server action with an empty plan id (which would surface a
			// validation error to the user for no reason).
			expect(
				getSubscribeResumeDecision({
					isAuthenticated: AUTHED,
					planParam: '',
					alreadyDispatched: NOT_DISPATCHED,
					planProvidersById: PLAN_PROVIDERS_BY_ID,
					lockedProvider: null,
				}),
			).toEqual({ kind: 'skip' });
		});

		test('skips whitespace-only plan param', () => {
			// Same rationale as empty-string: a whitespace-only plan id should
			// be treated as "no intent" rather than firing a validation failure.
			expect(
				getSubscribeResumeDecision({
					isAuthenticated: AUTHED,
					planParam: '   ',
					alreadyDispatched: NOT_DISPATCHED,
					planProvidersById: PLAN_PROVIDERS_BY_ID,
					lockedProvider: null,
				}),
			).toEqual({ kind: 'skip' });
		});

		test('skips when already dispatched (StrictMode / concurrent re-render guard)', () => {
			// The trigger sets its ref synchronously before awaiting the server
			// action. StrictMode double-mounts the effect in dev, so the second
			// run sees `alreadyDispatched: true` and must short-circuit.
			expect(
				getSubscribeResumeDecision({
					isAuthenticated: AUTHED,
					planParam: 'plan_pro',
					alreadyDispatched: DISPATCHED,
					planProvidersById: PLAN_PROVIDERS_BY_ID,
					lockedProvider: SUBSCRIPTION_PROVIDER.STRIPE,
				}),
			).toEqual({ kind: 'skip' });
		});
	});

	describe('precedence', () => {
		test('auth gate wins over dispatched flag', () => {
			// If a guest somehow hits the trigger with alreadyDispatched=false,
			// the auth check must reject first so neither dispatch nor
			// unavailable is constructed for an unauthenticated session.
			expect(
				getSubscribeResumeDecision({
					isAuthenticated: GUEST,
					planParam: 'plan_pro',
					alreadyDispatched: NOT_DISPATCHED,
					planProvidersById: PLAN_PROVIDERS_BY_ID,
					lockedProvider: SUBSCRIPTION_PROVIDER.STRIPE,
				}).kind,
			).toBe('skip');
		});

		test('missing param wins over dispatched flag', () => {
			expect(
				getSubscribeResumeDecision({
					isAuthenticated: AUTHED,
					planParam: null,
					alreadyDispatched: DISPATCHED,
					planProvidersById: PLAN_PROVIDERS_BY_ID,
					lockedProvider: null,
				}).kind,
			).toBe('skip');
		});
	});
});
