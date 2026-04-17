'use client';

// Client boundary: reads `?plan=<id>`, dispatches the subscription server
// action once, and hands off to Stripe. Mirrors the one-shot effect pattern
// used by `SubscriptionCancelToast` and `SubscriptionSuccessDialog`.

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import { subscribeToPlan } from '@/services/subscription/subscribe-to-plan';

import { getSubscribeResumeDecision } from './subscribe-resume-decision';

interface SubscribeResumeTriggerProps {
	/**
	 * Whether the viewer has an active session. Resume is pointless for
	 * guests — the unauth CTA would just bounce them back to sign-in and
	 * into an infinite loop. Parent already knows this; passing it down
	 * avoids a second session lookup here.
	 */
	readonly isAuthenticated: boolean;
}

/**
 * Auto-resumes the Stripe Checkout handoff when the user lands on
 * `/pricing?plan=<id>` after signing in. This closes the loop opened by the
 * unauthenticated `SubscribeButton` click path, which encodes the plan id
 * into `returnTo` so the user never has to re-pick a plan after login.
 *
 * The component renders nothing and dispatches at most once per mount. The
 * `plan` param is scrubbed immediately on success or failure so a reload
 * cannot re-fire the action and hand the user two Stripe sessions.
 */
export function SubscribeResumeTrigger({
	isAuthenticated,
}: SubscribeResumeTriggerProps) {
	const searchParams = useSearchParams();
	const router = useRouter();

	// Idempotency guard — StrictMode double-mounts the effect in dev, and
	// React concurrent rendering can run this effect more than once in prod
	// under pathological conditions (e.g. transition interrupts). A ref
	// (not state) because we never want a render from the guard flip.
	const hasDispatchedRef = useRef(false);

	useEffect(() => {
		// Step 1: Decide whether to dispatch. All branch logic lives in the
		// pure helper (co-located unit tests cover every exit), so this effect
		// only owns side effects: URL scrub, server-action call, redirect.
		const decision = getSubscribeResumeDecision({
			isAuthenticated,
			planParam: searchParams.get('plan'),
			alreadyDispatched: hasDispatchedRef.current,
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

		// Step 4: Fire the server action. Success → full-page hop to Stripe.
		// Failure → surface via toast and leave the user on /pricing where
		// the plan cards let them retry manually.
		async function dispatchResume(planId: string) {
			try {
				const result = await subscribeToPlan({ planId });
				if (!result.success) {
					toast.error(
						"We couldn't resume your checkout. Please pick a plan again.",
					);
					return;
				}
				window.location.assign(result.data.checkoutUrl);
			} catch {
				// Defensive — server actions normally return ServiceResponse,
				// but a raw throw (network blip, JSON parse bypass) must still
				// leave the user with an actionable UI, not a silent no-op.
				toast.error(
					"We couldn't resume your checkout. Please pick a plan again.",
				);
			}
		}

		void dispatchResume(decision.planId);
	}, [isAuthenticated, router, searchParams]);

	return null;
}
