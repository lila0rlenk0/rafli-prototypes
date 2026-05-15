import type {
	SubscriptionPlan,
	SubscriptionProvider,
} from '@/types/subscription';

import { pickSubscribeProvider } from './pick-subscribe-provider';

/**
 * Pure decision helper for the "resume subscribe handoff after sign-in" flow.
 *
 * Extracted from `SubscribeResumeTrigger` so the branch logic can be unit
 * tested without a DOM. The trigger itself is a `useEffect` client component
 * that cannot be exercised under the project's "no `@testing-library/react`"
 * rule — keeping the branch logic pure is the only way to cover it.
 *
 * Three exits:
 *   - `skip` — render a no-op (guest, missing param, or already dispatched).
 *   - `dispatch` — fire `subscribeToPlan({ planId, provider })`. The provider
 *     is resolved via `pickSubscribeProvider` against the plan's BE-exposed
 *     `availableProviders` and the viewer's `lockedProvider`, so the
 *     dispatcher never hits the BE with a `provider-locked` mismatch.
 *   - `unavailable` — the URL plan id is either unknown to the catalogue
 *     (stale link after Ops disabled the plan) or not offered on the
 *     viewer's locked rail. The trigger toasts + scrubs the param so the
 *     user lands cleanly on /pricing and can pick again.
 *
 * The guard is intentionally over-defensive against empty / whitespace-only
 * plan ids; a stray `?plan=` from a mangled redirect should never fire a
 * server action with an empty string.
 */
export type SubscribeResumeDecision =
	| { kind: 'skip' }
	| {
			kind: 'dispatch';
			planId: string;
			provider: SubscriptionProvider;
	  }
	| { kind: 'unavailable'; planId: string };

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
	/**
	 * Per-plan `availableProviders` keyed by plan id. Resolved on the page
	 * from `GET /subscriptions/plans` and passed down so the trigger can
	 * pick the correct rail without a second fetch. A missing entry means
	 * the plan id is not in the catalogue (Ops disabled it or the URL is
	 * stale) and we surface that as `unavailable` rather than dispatch.
	 */
	planProvidersById: Record<string, SubscriptionPlan['availableProviders']>;
	/**
	 * Viewer's locked provider from `GET /me/subscription`. Null for
	 * first-time buyers; non-null pins the resume to the rail the buyer's
	 * billing history already lives on.
	 */
	lockedProvider: SubscriptionProvider | null;
}

/**
 * Decides whether the resume trigger should dispatch the subscription action.
 *
 * @param params - Authentication, URL param, idempotency flag, plan catalogue,
 *   and the viewer's locked provider.
 * @returns Exactly one of `skip` | `dispatch` | `unavailable` — the trigger
 *   maps this to a no-op, a fire-and-redirect, or a toast-and-scrub respectively.
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

	// Step 5: Catalogue lookup. A missing entry means the plan id isn't on
	// the current pricing page — usually a stale link after Ops disabled the
	// plan, or a hand-tampered URL. Surface as `unavailable` so the trigger
	// scrubs the param and toasts instead of firing a guaranteed-to-fail
	// `payments:subscription:plan-not-found`.
	const availableProviders = params.planProvidersById[planId];
	if (availableProviders === undefined) {
		return { kind: 'unavailable', planId };
	}

	// Step 6: Resolve the rail. `null` here means the plan exists but is not
	// offered on the viewer's locked provider; the BE would reject with
	// `payments:subscription:provider-locked` — surface the same `unavailable`
	// exit so the user picks a plan that's on their rail instead.
	const provider = pickSubscribeProvider({
		availableProviders,
		lockedProvider: params.lockedProvider,
	});
	if (provider === null) {
		return { kind: 'unavailable', planId };
	}

	return { kind: 'dispatch', planId, provider };
}
