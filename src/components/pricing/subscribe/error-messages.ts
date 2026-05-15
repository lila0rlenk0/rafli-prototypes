import {
	SUBSCRIPTION_ERROR_CODES,
	type SubscriptionErrorCode,
} from '@/types/errors';

/**
 * User-facing copy for subscription failures shared by `SubscribeButton`,
 * `ManageSubscriptionButton`, and the cancel dialog. Three surfaces, same
 * `SubscriptionErrorCode` union, mostly identical messaging — extracted so
 * a copy tweak (or a backend rename caught by a keyless `Partial<Record>`)
 * lands in one place.
 *
 * Sign-in copy stays per-surface to keep the deflect actionable; everything
 * else collapses to a shared lookup with a per-surface generic fallback.
 *
 * The lookup uses `Partial<Record<>>` (matching the pattern in
 * `@/lib/checkout/error-messages`) so we only enumerate codes with
 * meaningful surface copy. A backend rename of any listed code blows up
 * at compile time because keys are typed `SubscriptionErrorCode`.
 */

/** Codes treated as "user is unauthenticated" — both surfaces deflect to sign-in. */
const SIGN_IN_CODES: ReadonlySet<SubscriptionErrorCode> = new Set([
	'global:auth:unauthenticated',
	'unauthorized',
	'session_expired',
] satisfies SubscriptionErrorCode[]);

const NETWORK_RETRY = 'Network trouble — check your connection and try again.';

const SHARED_MESSAGES: Partial<Record<SubscriptionErrorCode, string>> = {
	[SUBSCRIPTION_ERROR_CODES.NOT_FOUND]:
		'There was a problem with your subscription. Please contact support.',
	[SUBSCRIPTION_ERROR_CODES.NOT_ACTIVE]:
		'There was a problem with your subscription. Please contact support.',
	[SUBSCRIPTION_ERROR_CODES.ENROLLMENT_CONFLICT]:
		'There was a problem with your subscription. Please contact support.',
	[SUBSCRIPTION_ERROR_CODES.FETCH_FAILED]:
		"Something went wrong on our end. We've been notified.",
	[SUBSCRIPTION_ERROR_CODES.PROVIDER_NOT_SUPPORTED]:
		"That plan isn't available on your billing provider. Refresh the page to see your current options.",
	// Misconfigured plan — BE row points at a Stripe Price that doesn't exist
	// in the active Stripe account. Retrying will fail identically until Ops
	// re-seeds the price id, so the copy deflects to support instead of
	// suggesting a refresh (the existing fallback's implicit promise).
	[SUBSCRIPTION_ERROR_CODES.STRIPE_PRICE_INVALID]:
		'This plan is temporarily unavailable. Please pick a different plan, or contact support if the issue persists.',
	// Fanbasis upstream faults — surfaced via the unified subscription REST
	// surface on the Fanbasis-locked path. Distinct from the public-credit
	// flow's identical URNs, but identical copy intent: retry is honest on
	// `checkout-failed` (transient upstream); `rate-limited` needs a wait.
	'payments:fanbasis:checkout-failed':
		"We couldn't reach your payment provider. Please try again in a moment.",
	'payments:fanbasis:rate-limited':
		'Too many requests — please wait a moment and try again.',
	'global:ratelimit:exceeded':
		'Too many requests — please wait a moment and try again.',
	network_error: NETWORK_RETRY,
	timeout_error: NETWORK_RETRY,
	connection_aborted: NETWORK_RETRY,
};

interface ResolveOptions {
	/** Copy shown for any `SIGN_IN_CODES` member. */
	readonly signInPrompt: string;
	/** Surface-specific overrides — win over `SHARED_MESSAGES`. */
	readonly overrides: Partial<Record<SubscriptionErrorCode, string>>;
	/** Fallback for any code without a mapped message. */
	readonly fallback: string;
}

function resolveErrorMessage(
	code: SubscriptionErrorCode,
	options: ResolveOptions,
): string {
	if (SIGN_IN_CODES.has(code)) return options.signInPrompt;
	return options.overrides[code] ?? SHARED_MESSAGES[code] ?? options.fallback;
}

const SUBSCRIBE_OVERRIDES: Partial<Record<SubscriptionErrorCode, string>> = {
	[SUBSCRIPTION_ERROR_CODES.PLAN_NOT_FOUND]:
		'This plan is no longer available. Please refresh and try again.',
	[SUBSCRIPTION_ERROR_CODES.ALREADY_SUBSCRIBED]:
		"You're already subscribed. Manage your plan from your profile.",
	[SUBSCRIPTION_ERROR_CODES.CHECKOUT_FAILED]:
		"We couldn't start checkout. Please try again in a moment.",
	// Honest copy: provider lock is a billing-history invariant, not a defect.
	// Once the user has any prior subscription row, the backend pins them to
	// that provider so switching wouldn't fork billing history. The CTA is
	// already gated against this via `lockedProvider` from
	// GET /me/subscription, so reaching this toast means the request was
	// tampered with — point them back at the locked provider's plans rather
	// than offering a generic retry that will fail the same way.
	[SUBSCRIPTION_ERROR_CODES.PROVIDER_LOCKED]:
		'This payment provider is locked to your existing subscription history. Please pick a plan from your original provider.',
};

/**
 * Toast copy for `subscribeToPlan` failures rendered by `SubscribeButton`.
 *
 * @returns User-facing message for the supplied code.
 */
export function getSubscribeErrorMessage(code: SubscriptionErrorCode): string {
	return resolveErrorMessage(code, {
		signInPrompt: 'Please sign in to subscribe.',
		overrides: SUBSCRIBE_OVERRIDES,
		fallback: "We couldn't start checkout. Please try again.",
	});
}

const MANAGE_OVERRIDES: Partial<Record<SubscriptionErrorCode, string>> = {
	// Portal-only code: user reached Manage without ever subscribing
	// (or Stripe deleted the customer). Deflect to /pricing instead of
	// looping them on the disabled portal CTA.
	[SUBSCRIPTION_ERROR_CODES.NO_CUSTOMER]:
		"You don't have an active subscription yet. Pick a plan above to get started.",
};

/**
 * Toast copy for `createBillingPortal` failures rendered by
 * `ManageSubscriptionButton`.
 *
 * @returns User-facing message for the supplied code.
 */
export function getManagePortalErrorMessage(
	code: SubscriptionErrorCode,
): string {
	return resolveErrorMessage(code, {
		signInPrompt: 'Please sign in to manage your subscription.',
		overrides: MANAGE_OVERRIDES,
		fallback: "We couldn't open the billing portal. Please try again.",
	});
}

const CANCEL_OVERRIDES: Partial<Record<SubscriptionErrorCode, string>> = {
	// Cancel-specific copy beats the shared "contact support" message — the
	// user's intent is unambiguous (they're trying to cancel) so we can be
	// honest about why the request was rejected without alarming them.
	[SUBSCRIPTION_ERROR_CODES.NOT_FOUND]:
		"We couldn't find that subscription. Refresh the page and try again.",
	[SUBSCRIPTION_ERROR_CODES.NOT_ACTIVE]:
		'This subscription is already cancelled.',
	// Provider-side DELETE failure when the user's lock points at Fanbasis.
	// Distinct from `not-active` (state mismatch on our side) — this is a
	// transient upstream fault (Fanbasis 5xx, network, auth) so retry is the
	// honest next step. Cancel-specific override beats the SHARED_MESSAGES
	// fallback because the user's intent on this surface is unambiguous.
	'payments:fanbasis:cancel-failed':
		"We couldn't cancel with your payment provider. Please try again in a moment, or contact support if the issue persists.",
};

/**
 * Toast copy for `cancelSubscription` failures rendered by the cancel
 * confirmation dialog.
 *
 * @returns User-facing message for the supplied code.
 */
export function getCancelErrorMessage(code: SubscriptionErrorCode): string {
	return resolveErrorMessage(code, {
		signInPrompt: 'Please sign in to cancel your subscription.',
		overrides: CANCEL_OVERRIDES,
		fallback: "We couldn't cancel your subscription. Please try again.",
	});
}

const CHANGE_PLAN_OVERRIDES: Partial<Record<SubscriptionErrorCode, string>> = {
	// Plan was deactivated between catalogue fetch and click — refresh
	// reconciles the UI with the new active set.
	[SUBSCRIPTION_ERROR_CODES.PLAN_NOT_FOUND]:
		'This plan is no longer available. Please refresh and pick another.',
	// Race with the BE state: subscription cancelled / not-active between
	// open-dialog and submit. Different copy from the create-subscribe flow
	// because the user is in the manage surface, not the acquisition funnel.
	[SUBSCRIPTION_ERROR_CODES.NOT_FOUND]:
		"We couldn't find that subscription. Refresh the page and try again.",
	[SUBSCRIPTION_ERROR_CODES.NOT_ACTIVE]:
		"This subscription isn't active any more. Refresh the page to see your options.",
	// Per alignment doc: queued downgrade already exists, user must cancel it
	// first. UI gates the click via `hasPendingChange`, but a stale cache or
	// a second tab can still race past it.
	[SUBSCRIPTION_ERROR_CODES.PENDING_CHANGE_EXISTS]:
		'You have a queued plan change — cancel it before scheduling another.',
	// Per alignment doc: same plan, or upgrade on `period_end`. The dialog's
	// direction logic gates `period_end` for upgrades, so this fires only
	// when the catalogue is stale (same plan id, different price).
	[SUBSCRIPTION_ERROR_CODES.INVALID_PLAN_CHANGE]: 'Pick a different plan.',
	// CAS race between two requests / a webhook. Retry is honest.
	[SUBSCRIPTION_ERROR_CODES.PLAN_CHANGE_CONFLICT]:
		'Something changed while we were processing — please try again.',
	// Same upstream-fault rationale as `getSubscribeErrorMessage`, surfaced
	// here too because change-plan delegates to Fanbasis on the redirect path.
	[SUBSCRIPTION_ERROR_CODES.CHECKOUT_FAILED]:
		"We couldn't switch your plan. Please try again in a moment.",
};

/**
 * Toast copy for `changePlan` failures rendered by `ChangePlanDialog`.
 *
 * Separate from `getSubscribeErrorMessage` because the surfaces are
 * semantically distinct: subscribe is acquisition (no current row), change
 * is mutation against an existing one. The race URNs
 * (`pending-change-exists`, `invalid-plan-change`, `plan-change-conflict`)
 * only exist on this surface, and the `not-found` copy diverges because the
 * user is mid-manage, not deciding to subscribe.
 *
 * @returns User-facing message for the supplied code.
 */
export function getChangePlanErrorMessage(code: SubscriptionErrorCode): string {
	return resolveErrorMessage(code, {
		signInPrompt: 'Please sign in to change your plan.',
		overrides: CHANGE_PLAN_OVERRIDES,
		fallback: "We couldn't switch your plan. Please try again.",
	});
}

/**
 * Outcome of `cancelScheduledChange` after the FE classifies the response.
 *
 * The BE returns non-2xx for two race conditions the user shouldn't see as
 * failures: phase[1] auto-applied between render and click, or another tab
 * cancelled first. Both leave the subscription in the state the user wanted,
 * so the dialog refetches and surfaces an informational toast (or stays
 * silent) instead of an error.
 *
 * - `applied`  — phase[1] already took effect; the queued plan is now live.
 *                Show an info toast so the user knows their swap happened.
 * - `noop`     — nothing was queued (or another tab cleared it). Silent;
 *                the refetch updates the UI on its own.
 * - `error`    — genuine failure; show `message` as a toast.
 */
export type CancelScheduledChangeOutcome =
	| { readonly kind: 'applied'; readonly message: string }
	| { readonly kind: 'noop' }
	| { readonly kind: 'error'; readonly message: string };

const CANCEL_SCHEDULED_CHANGE_OVERRIDES: Partial<
	Record<SubscriptionErrorCode, string>
> = {
	[SUBSCRIPTION_ERROR_CODES.NOT_FOUND]:
		"We couldn't find that subscription. Refresh the page and try again.",
};

/**
 * Classifies a `cancelScheduledChange` error code into the FE outcome the
 * banner renders on. The two race codes
 * (`pending-change-already-applied`, `no-pending-change`) are intentionally
 * NOT surfaced as failures — they map to `'applied'` and `'noop'` so the
 * caller can refetch and show informational copy without alarming the user.
 *
 * @returns Discriminated outcome the banner branches on.
 */
export function getCancelScheduledChangeOutcome(
	code: SubscriptionErrorCode,
): CancelScheduledChangeOutcome {
	if (code === SUBSCRIPTION_ERROR_CODES.PENDING_CHANGE_ALREADY_APPLIED) {
		return {
			kind: 'applied',
			message: 'Your plan change already took effect.',
		};
	}
	if (code === SUBSCRIPTION_ERROR_CODES.NO_PENDING_CHANGE) {
		return { kind: 'noop' };
	}
	return {
		kind: 'error',
		message: resolveErrorMessage(code, {
			signInPrompt: 'Please sign in to cancel your scheduled change.',
			overrides: CANCEL_SCHEDULED_CHANGE_OVERRIDES,
			fallback: "We couldn't cancel your scheduled change. Please try again.",
		}),
	};
}
