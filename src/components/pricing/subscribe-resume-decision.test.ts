import { describe, expect, test } from 'bun:test';

import { getSubscribeResumeDecision } from './subscribe-resume-decision';

const AUTHED = true;
const GUEST = false;
const NOT_DISPATCHED = false;
const DISPATCHED = true;

describe('getSubscribeResumeDecision', () => {
	describe('dispatch path', () => {
		test('dispatches when authenticated, plan present, and not yet dispatched', () => {
			// The golden case: returning user lands on /pricing?plan=plan_pro
			// after sign-in and the trigger fires exactly once.
			expect(
				getSubscribeResumeDecision({
					isAuthenticated: AUTHED,
					planParam: 'plan_pro',
					alreadyDispatched: NOT_DISPATCHED,
				}),
			).toEqual({ kind: 'dispatch', planId: 'plan_pro' });
		});

		test('trims surrounding whitespace in the plan id before dispatching', () => {
			// URL encoders occasionally emit a leading/trailing space on round-trip
			// through sign-in; we shouldn't fail closed on harmless whitespace.
			expect(
				getSubscribeResumeDecision({
					isAuthenticated: AUTHED,
					planParam: '  plan_starter  ',
					alreadyDispatched: NOT_DISPATCHED,
				}),
			).toEqual({ kind: 'dispatch', planId: 'plan_starter' });
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
				}),
			).toEqual({ kind: 'skip' });
		});

		test('skips when no plan param is present (the 99% normal-landing case)', () => {
			expect(
				getSubscribeResumeDecision({
					isAuthenticated: AUTHED,
					planParam: null,
					alreadyDispatched: NOT_DISPATCHED,
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
				}),
			).toEqual({ kind: 'skip' });
		});
	});

	describe('precedence', () => {
		test('auth gate wins over dispatched flag', () => {
			// If a guest somehow hits the trigger with alreadyDispatched=false,
			// the auth check must reject first so the "dispatch" kind is never
			// constructed with an unauthenticated session.
			expect(
				getSubscribeResumeDecision({
					isAuthenticated: GUEST,
					planParam: 'plan_pro',
					alreadyDispatched: NOT_DISPATCHED,
				}).kind,
			).toBe('skip');
		});

		test('missing param wins over dispatched flag', () => {
			expect(
				getSubscribeResumeDecision({
					isAuthenticated: AUTHED,
					planParam: null,
					alreadyDispatched: DISPATCHED,
				}).kind,
			).toBe('skip');
		});
	});
});
