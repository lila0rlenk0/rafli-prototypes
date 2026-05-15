import type { CommonErrorCode } from './common-errors';
import type { FANBASIS_PUBLIC_CREDIT_ERROR_CODES } from './fanbasis-public-credit-errors';

/**
 * Subscription Error Codes
 *
 * Codes returned by the backend `payments:subscription:*` namespace (see
 * `raffles-core-backend/src/payments/commands/*-subscription.command.ts`).
 * Grouped below by the endpoint that can raise them, because the pricing
 * page surfaces different copy per entry point (plans list vs. subscribe vs.
 * my-subscription) and the grouping makes it obvious which mapper branch
 * each code exercises.
 */
export const SUBSCRIPTION_ERROR_CODES = {
	// Create subscription — raised by POST /subscriptions.
	/** Requested plan is inactive or missing — Ops deactivated it after the UI fetched /plans */
	PLAN_NOT_FOUND: 'payments:subscription:plan-not-found',
	/** User already has an active/cancelled/past_due subscription — blocks new checkout */
	ALREADY_SUBSCRIBED: 'payments:subscription:already-subscribed',
	/** Stripe did not return a checkout URL — backend-side Stripe API failure */
	CHECKOUT_FAILED: 'payments:subscription:checkout-failed',
	/**
	 * Caller asked to subscribe via a provider the user is not locked to. The
	 * lock sticks once the user has any prior subscription row; switching
	 * providers would split billing history. UI should never raise this
	 * organically (the CTA is gated by `lockedProvider` from
	 * GET /me/subscription) — surfaced here so a tampered request still has
	 * a mapped toast instead of falling through to the generic fallback.
	 */
	PROVIDER_LOCKED: 'payments:subscription:provider-locked',
	/**
	 * Misconfigured plan — DB row points at a Stripe Price that doesn't exist
	 * in the active Stripe account (test/live key mismatch, deleted price, or
	 * stale prod seed). BE raises `payments:subscription:stripe-price-invalid`
	 * as a 422 from the Stripe subscribe path. Distinct from CHECKOUT_FAILED
	 * because the user's retry will fail identically — Ops must re-seed the
	 * price id; the FE surfaces actionable copy so the user knows to contact
	 * support instead of refreshing forever.
	 */
	STRIPE_PRICE_INVALID: 'payments:subscription:stripe-price-invalid',
	/**
	 * Target plan is not subscribable on the user's current provider rail —
	 * Stripe path raises when `newPlan.stripePriceId IS NULL`, Fanbasis when
	 * `newPlan.fanbasisProductId IS NULL`. Same URN is also raised by the
	 * create path for first-time buyers picking a provider the plan doesn't
	 * offer. The pricing UI gates the CTA via `pickSubscribeProvider` so
	 * reaching this toast means the catalogue raced an Ops disable between
	 * page render and click, or the request was tampered with.
	 */
	PROVIDER_NOT_SUPPORTED: 'payments:subscription:provider-not-supported',

	// Change-plan + scheduled-change — raised by PATCH /subscriptions/:id and
	// DELETE /subscriptions/:id/scheduled-change. Grouped together because the
	// two endpoints share the queued-downgrade state machine and the race
	// codes can surface from either path depending on phase timing.
	/**
	 * Caller attempted to queue a second plan change while one is already
	 * pending. BE refuses to stack pending changes (Stripe schedule semantics
	 * are single-phase). FE gates the CTA via `hasPendingChange`, so reaching
	 * this toast means the user opened the dialog before the cache updated.
	 */
	PENDING_CHANGE_EXISTS: 'payments:subscription:pending-change-exists',
	/**
	 * User hit "Cancel scheduled change" after Stripe auto-applied phase[1]
	 * of the schedule between the page render and the click. NOT a failure
	 * from the user's POV — the swap they queued already took effect on its
	 * own. UI surfaces an informational toast and refetches `/me/subscription`
	 * so `planId` flips to the previous `pendingPlanId` and the banner clears.
	 * Treated as a soft-success in the FE flow even though the BE returns
	 * non-2xx, because the user's intent (apply the change) is now satisfied.
	 */
	PENDING_CHANGE_ALREADY_APPLIED:
		'payments:subscription:pending-change-already-applied',
	/**
	 * User hit "Cancel scheduled change" but no change was queued — usually
	 * because another tab cancelled first, or the schedule auto-expired. UI
	 * silently refetches and clears the banner; no toast (the user's intent is
	 * already satisfied — there's nothing to cancel).
	 */
	NO_PENDING_CHANGE: 'payments:subscription:no-pending-change',
	/**
	 * Change-plan was called with an invalid target — either the new plan
	 * matches the current plan, or `effective: 'period_end'` was sent for an
	 * upgrade (Stripe only supports schedule-at-period-end for downgrades).
	 * FE direction logic gates the latter, so this toast means the catalogue
	 * is stale (same plan id resolved to a different price) or the request
	 * was tampered with.
	 */
	INVALID_PLAN_CHANGE: 'payments:subscription:invalid-plan-change',
	/**
	 * Optimistic-concurrency check failed on the BE (CAS race between two
	 * change-plan requests, or between change-plan and a webhook update).
	 * Retry is the honest next step — the second request will read the
	 * committed state and either succeed or surface a more specific code.
	 */
	PLAN_CHANGE_CONFLICT: 'payments:subscription:plan-change-conflict',

	// Manage subscription — raised by cancel + GET /me/subscription flows.
	/** Subscription row not found for this user — e.g. already expired */
	NOT_FOUND: 'payments:subscription:not-found',
	/** Attempted to cancel a non-active subscription */
	NOT_ACTIVE: 'payments:subscription:not-active',
	/** Webhook enrollment race — user ended up double-subscribed, backend rolled back */
	ENROLLMENT_CONFLICT: 'payments:subscription:enrollment-conflict',
	/**
	 * Billing portal — user has no Stripe customer record (never subscribed,
	 * or Stripe deleted the customer). 404 from POST /me/billing-portal-sessions.
	 * Surfaced separately so the UI can deflect to /pricing instead of toasting
	 * a generic "something went wrong".
	 */
	NO_CUSTOMER: 'payments:subscription:no-customer',

	// Frontend-only — Zod parse failure on an otherwise-successful response.
	/** Response shape drifted from the backend contract — captured as contract drift */
	FETCH_FAILED: 'fetch_failed',
} as const;

/**
 * Union of every error code a subscription server action can surface.
 *
 * Three `payments:fanbasis:*` URNs are folded in because the unified
 * subscription REST surface delegates to Fanbasis for Fanbasis-locked users,
 * so provider-side faults legitimately surface through this domain:
 * - `CANCEL_FAILED`   — `DELETE /subscriptions/:id` upstream-cancel fault.
 * - `CHECKOUT_FAILED` — `POST /subscriptions` (Fanbasis path) when the
 *   upstream hosted-checkout mint fails (5xx, network, contract drift).
 * - `RATE_LIMITED`    — `POST /subscriptions` when Fanbasis returns 429.
 *
 * Individual literals (not the whole `FanbasisPublicCreditErrorCode` union)
 * so adding a public-credit-only code doesn't silently widen this surface.
 */
export type SubscriptionErrorCode =
	| (typeof SUBSCRIPTION_ERROR_CODES)[keyof typeof SUBSCRIPTION_ERROR_CODES]
	| (typeof FANBASIS_PUBLIC_CREDIT_ERROR_CODES)['CANCEL_FAILED']
	| (typeof FANBASIS_PUBLIC_CREDIT_ERROR_CODES)['CHECKOUT_FAILED']
	| (typeof FANBASIS_PUBLIC_CREDIT_ERROR_CODES)['RATE_LIMITED']
	| CommonErrorCode;
