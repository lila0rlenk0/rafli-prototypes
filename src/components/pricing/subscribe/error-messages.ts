import {
	SUBSCRIPTION_ERROR_CODES,
	type SubscriptionErrorCode,
} from '@/types/errors';

/**
 * User-facing copy for subscription failures shared by `SubscribeButton`
 * and `ManageSubscriptionButton`. Two surfaces, same `SubscriptionErrorCode`
 * union, mostly identical messaging — extracted so a copy tweak (or a
 * backend rename caught by a keyless `Partial<Record>`) lands in one place.
 *
 * Sign-in copy stays per-surface ("subscribe" vs "manage") to keep the
 * deflect actionable; everything else collapses to a shared lookup with
 * a per-surface generic fallback.
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
