'use client';

// Client boundary: reads `?plan=<id>`, dispatches the subscription server
// action once, and hands off to the hosted checkout. Mirrors the one-shot
// effect pattern used by `SubscriptionCancelToast` and
// `SubscriptionSuccessDialog`.

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import { useSubscribeResume } from '@/services/subscription/use-subscribe-resume';
import type {
	SubscriptionPlan,
	SubscriptionProvider,
} from '@/types/subscription';

import { getSubscribeResumeDecision } from './subscribe-resume-decision';

interface SubscribeResumeTriggerProps {
	/**
	 * Whether the viewer has an active session. Resume is pointless for
	 * guests — the unauth CTA would just bounce them back to sign-in and
	 * into an infinite loop. Parent already knows this; passing it down
	 * avoids a second session lookup here.
	 */
	readonly isAuthenticated: boolean;
	/**
	 * Provider rail the resume should target. Threaded from the page-level
	 * `lockedProvider` so a returning subscriber resumes on the rail their
	 * billing history already lives on. Null on first-time buyers — the
	 * decision helper falls back to the plan's own `availableProviders`
	 * (Stripe > Fanbasis precedence) before dispatching.
	 */
	readonly lockedProvider: SubscriptionProvider | null;
	/**
	 * Per-plan `availableProviders` from `GET /subscriptions/plans`, keyed by
	 * plan id. The trigger uses this to (a) reject `?plan=` ids that aren't in
	 * the current catalogue, and (b) resolve the correct rail for the resume
	 * dispatch without a second fetch. Pre-flattened on the page so the
	 * trigger does a single dictionary lookup at decision time.
	 */
	readonly planProvidersById: Record<
		string,
		SubscriptionPlan['availableProviders']
	>;
}

// Copy hoisted to module scope so the JSX-free trigger doesn't re-allocate
// the string on every effect run.
const PICK_AGAIN_COPY =
	"We couldn't resume your checkout. Please pick a plan again.";

/**
 * Auto-resumes the hosted-checkout handoff when the user lands on
 * `/pricing?plan=<id>` after signing in. This closes the loop opened by the
 * unauthenticated `SubscribeButton` click path, which encodes the plan id
 * into `returnTo` so the user never has to re-pick a plan after login.
 *
 * The component renders nothing and dispatches at most once per mount. The
 * `plan` param is scrubbed immediately on dispatch or unavailable-toast so a
 * reload cannot re-fire the action and hand the user two checkout sessions.
 *
 * Three branches off the decision helper:
 *   - `skip` — render null (guest, no param, already dispatched).
 *   - `dispatch` — call the resume mutation with the resolved provider.
 *   - `unavailable` — toast and scrub the param; the user lands on /pricing
 *     where the plan cards let them pick again on their actual rail.
 */
export function SubscribeResumeTrigger({
	isAuthenticated,
	lockedProvider,
	planProvidersById,
}: SubscribeResumeTriggerProps) {
	const searchParams = useSearchParams();
	const router = useRouter();
	// Pull `mutate` only — the full TanStack handle changes reference every
	// render and would re-fire this effect, defeating the
	// `hasDispatchedRef` idempotency guard under any unrelated re-render.
	const { mutate: subscribeResumeMutate } = useSubscribeResume();

	// Idempotency guard — StrictMode double-mounts the effect in dev, and
	// React concurrent rendering can run this effect more than once in prod
	// under pathological conditions (e.g. transition interrupts). A ref
	// (not state) because we never want a render from the guard flip.
	const hasDispatchedRef = useRef(false);

	useEffect(() => {
		// Step 1: Decide. All branch logic lives in the pure helper (co-located
		// unit tests cover every exit), so this effect only owns side effects.
		const decision = getSubscribeResumeDecision({
			isAuthenticated,
			planParam: searchParams.get('plan'),
			alreadyDispatched: hasDispatchedRef.current,
			planProvidersById,
			lockedProvider,
		});
		if (decision.kind === 'skip') return;

		// Step 2: Flip the idempotency guard synchronously. First commit wins;
		// a StrictMode re-run or concurrent re-render sees `true` here and
		// lands back in the helper's `alreadyDispatched` skip path.
		hasDispatchedRef.current = true;

		// Step 3: Scrub the `plan` param immediately so a reload mid-request
		// cannot re-trigger the action. Done before awaiting the server
		// action because the network call can take 500ms+.
		const next = new URLSearchParams(searchParams.toString());
		next.delete('plan');
		const queryString = next.toString();
		router.replace(queryString ? `/pricing?${queryString}` : '/pricing', {
			scroll: false,
		});

		// Step 4: Unavailable branch — the plan id is either stale (Ops
		// disabled it after the user copied the URL) or not offered on the
		// viewer's locked rail. Toast and bail so the user picks again from
		// the live cards on /pricing.
		if (decision.kind === 'unavailable') {
			toast.error(PICK_AGAIN_COPY);
			return;
		}

		// Step 5: Fire the React Query mutation. `provider` is already
		// resolved by the decision helper (BE will not see a `provider-locked`
		// mismatch). Success → full-page hop to the hosted checkout.
		// Failure → toast on /pricing where the plan cards let the user retry.
		subscribeResumeMutate(
			{ planId: decision.planId, provider: decision.provider },
			{
				onSuccess: result => {
					if (!result.success) {
						toast.error(PICK_AGAIN_COPY);
						return;
					}
					window.location.assign(result.data.checkoutUrl);
				},
				onError: () => {
					toast.error(PICK_AGAIN_COPY);
				},
			},
		);
	}, [
		isAuthenticated,
		lockedProvider,
		planProvidersById,
		router,
		searchParams,
		subscribeResumeMutate,
	]);

	return null;
}
