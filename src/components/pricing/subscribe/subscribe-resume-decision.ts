/**
 * Pure decision helper for the "resume Stripe checkout after sign-in" flow.
 *
 * Extracted from `SubscribeResumeTrigger` so the branch logic can be unit
 * tested without a DOM. The trigger itself is a `useEffect` client component
 * that cannot be exercised under the project's "no `@testing-library/react`"
 * rule — keeping the branch logic pure is the only way to cover it.
 *
 * Three exits:
 *   - `skip` — render a no-op (guest, missing param, or already dispatched)
 *   - `dispatch` — the trigger should call `subscribeToPlan({ planId })`
 *
 * The guard is intentionally over-defensive against empty / whitespace-only
 * plan ids; a stray `?plan=` from a mangled redirect should never fire a
 * server action with an empty string.
 */
export type SubscribeResumeDecision =
	| { kind: 'skip' }
	| { kind: 'dispatch'; planId: string };

interface SubscribeResumeDecisionParams {
	/** Whether the viewer has an active session. Guests must never dispatch. */
	isAuthenticated: boolean;
	/** Raw `?plan=` value read from the URL, or `null` when absent. */
	planParam: string | null;
	/**
	 * `true` when the component has already dispatched once this mount. The
	 * ref-based guard in the trigger maps directly to this flag.
	 */
	alreadyDispatched: boolean;
}

/**
 * Decides whether the resume trigger should dispatch the subscription action.
 *
 * @param params - Authentication, URL param, and idempotency guard state.
 * @returns Exactly one of `skip` | `dispatch` — the trigger maps this to
 *   either rendering null or firing the server action.
 */
export function getSubscribeResumeDecision(
	params: SubscribeResumeDecisionParams,
): SubscribeResumeDecision {
	// Step 1: Guests can't subscribe — the unauth CTA would just bounce them
	// through sign-in again, creating an infinite resume loop.
	if (!params.isAuthenticated) return { kind: 'skip' };

	// Step 2: No param → nothing to resume. This is the 99% path when the
	// user lands on /pricing normally.
	if (!params.planParam) return { kind: 'skip' };

	// Step 3: Trim to reject whitespace-only params ("?plan= "). Servers
	// routinely normalize these to empty strings; firing a server action with
	// an empty plan id would surface a validation error to the user for no
	// good reason.
	const planId = params.planParam.trim();
	if (planId.length === 0) return { kind: 'skip' };

	// Step 4: Idempotency — we've already fired once this mount (StrictMode
	// double-mount, concurrent re-render, etc.). Skip.
	if (params.alreadyDispatched) return { kind: 'skip' };

	return { kind: 'dispatch', planId };
}
