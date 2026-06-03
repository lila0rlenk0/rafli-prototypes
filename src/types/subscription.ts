import { z } from 'zod';

/**
 * Subscription Types — validation boundary between our web app and the
 * backend payments service. Schema-first per project convention: Zod
 * defines the contract, types are inferred, and parsing happens in the
 * server action so downstream consumers work with already-validated data.
 *
 * Wire formats worth noting:
 * - Monetary values are decimal strings (e.g. "25.0000") to avoid the
 *   float drift we hit on earlier Stripe integrations.
 * - `metadata` is a freeform JSONB blob that Ops writes directly in
 *   Postgres — the schema below is a strict superset that pins every
 *   field the pricing page renders so a typo in admin breaks loudly
 *   in Sentry instead of silently in the UI.
 */

/**
 * Subscription lifecycle statuses from the backend `subscription_status_enum`.
 * Semantics:
 * - `active`    — Billing in good standing, credits granted each cycle.
 * - `cancelled` — User requested cancel, benefits continue until `currentPeriodEnd`.
 * - `past_due`  — Payment failed, Stripe retrying — user retains benefits during dunning.
 * - `expired`   — Terminal. No more benefits.
 */
export const SUBSCRIPTION_STATUS = {
	ACTIVE: 'active',
	CANCELLED: 'cancelled',
	PAST_DUE: 'past_due',
	EXPIRED: 'expired',
} as const;

export type SubscriptionStatus =
	(typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS];

const subscriptionStatusSchema = z.enum([
	SUBSCRIPTION_STATUS.ACTIVE,
	SUBSCRIPTION_STATUS.CANCELLED,
	SUBSCRIPTION_STATUS.PAST_DUE,
	SUBSCRIPTION_STATUS.EXPIRED,
]);

/**
 * Payment provider that owns the subscription lifecycle.
 *
 * Two providers coexist because they serve different rails:
 * - `stripe`   — standard card-on-file billing with a Stripe customer + portal.
 * - `fanbasis` — embedded public-credit hosted checkout; the user never becomes
 *   a Stripe customer, so portal-style self-serve flows do not exist and any
 *   capability that requires one is exposed as `false` (see capabilities below).
 *
 * Mirrors `SubscriptionProvider` defined in
 * `raffles-core-backend/src/payments/db/schema.ts` — keep the union in sync if
 * a third provider is ever added.
 */
export const SUBSCRIPTION_PROVIDER = {
	STRIPE: 'stripe',
	FANBASIS: 'fanbasis',
} as const;

export type SubscriptionProvider =
	(typeof SUBSCRIPTION_PROVIDER)[keyof typeof SUBSCRIPTION_PROVIDER];

const subscriptionProviderSchema = z.enum([
	SUBSCRIPTION_PROVIDER.STRIPE,
	SUBSCRIPTION_PROVIDER.FANBASIS,
]);

/**
 * Single feature bullet rendered inside a plan card.
 *
 * `tag` is an optional highlight label like "LIMITED OFFER" or "NEW" that
 * sits next to the feature text on the card — Ops sets it in the plan
 * metadata. `.nullable()` mirrors the backend DTO (`null | string`) rather
 * than omitting the key; matching the wire shape keeps parse errors honest.
 */
const subscriptionPlanFeatureSchema = z.object({
	text: z.string(),
	tag: z.string().nullable(),
});

/**
 * Plan metadata — the display blob the pricing page renders verbatim.
 * Every field mirrors `SubscriptionPlanMetadataDto` on the backend.
 *
 * `nullable()` (not `optional()`) matches how Encore serializes explicit
 * `T | null` fields over the wire — optional fields can be silently dropped
 * on cross-service hops, so the backend uses `null` sentinels deliberately.
 */
const subscriptionPlanMetadataSchema = z.object({
	badgeText: z.string().nullable(),
	highlightLabel: z.string().nullable(),
	isHighlighted: z.boolean(),
	sortOrder: z.number(),
	tagline: z.string(),
	features: z.array(subscriptionPlanFeatureSchema),
});

/**
 * Subscription plan entity returned by `GET /subscriptions/plans`.
 * Monetary values are decimal strings — format the display at the render
 * boundary, never parse to Number here.
 *
 * `availableProviders` lists the rails this specific plan is subscribable on
 * (derived BE-side from the plan's `stripePriceId` / `fanbasisProductId`
 * columns — see `deriveAvailableProviders` in the BE plans query). The BE
 * filters out plans where neither id is set, so the array is guaranteed
 * non-empty. The FE picks the actual subscribe-rail per plan via
 * `pickSubscribeProvider(availableProviders, lockedProvider)` instead of
 * defaulting unconditionally to Stripe — that earlier default was a
 * placeholder that pre-dates this field.
 */
const subscriptionPlanSchema = z.object({
	id: z.uuidv7(),
	name: z.string(),
	monthlyPriceAmount: z.string(),
	creditAmount: z.string(),
	discountPercent: z.number(),
	availableProviders: z.array(subscriptionProviderSchema).min(1),
	metadata: subscriptionPlanMetadataSchema,
});

/** Response shape for `GET /subscriptions/plans` — always wrapped in `plans`. */
export const subscriptionPlansResponseSchema = z.object({
	plans: z.array(subscriptionPlanSchema),
});

/**
 * Per-provider self-serve capability matrix returned alongside the subscription.
 *
 * The FE branches UI on these booleans rather than hard-coding
 * `provider === 'stripe'` checks — adding a third provider should not require
 * touching every component that renders a billing CTA, only the backend mapping.
 *
 * Mirrors `SubscriptionCapabilitiesDto` on the backend.
 */
const subscriptionCapabilitiesSchema = z.object({
	// both providers support cancel today; the flag exists so a future provider
	// that requires operator-driven cancel can flip it false without a wire change.
	canCancel: z.boolean(),
	// stripe = atomic price-id swap with proration; fanbasis = no native endpoint,
	// the dispatcher orchestrates cancel-and-recreate and returns a fresh checkout
	// url — flag stays true because the operation is supported, just via redirect.
	canChangePlan: z.boolean(),
	// stripe = true via the customer portal; fanbasis = false (read-only
	// payment-methods endpoint, the user can't update card-on-file).
	canUpdatePaymentMethod: z.boolean(),
	// stripe = true (hosted billing portal); fanbasis = false (no portal product).
	// when false the FE must render its own cancel UI in-app.
	hasSelfServePortal: z.boolean(),
	// stripe = true (in-place plan swap at period end); fanbasis = false (no
	// schedule endpoint — downgrades require cancel-then-resubscribe). The FE
	// gates the "Switch at renewal" CTA on this flag instead of branching on
	// provider strings so a future provider with native scheduling drops in
	// via one BE mapping change.
	canScheduleDowngrade: z.boolean(),
	// true iff a `pendingPlan` is currently queued — drives whether the
	// scheduled-change banner exposes its "Cancel scheduled change" CTA.
	canCancelScheduledChange: z.boolean(),
});

/**
 * The authenticated user's current subscription as returned by
 * `GET /me/subscription`.
 *
 * Design choice: the backend embeds the full `SubscriptionPlan` entity rather
 * than returning just a `planId`. Embedding lets every consumer (dialog, nav
 * badge, pricing card "current" state) render tier visuals, price, feature
 * list, etc. without a second round-trip, and it collapses to a single cache
 * key in React Query. The small bandwidth cost is acceptable because the
 * `/me/subscription` payload is fetched at most a couple of times per session.
 *
 * Wire shape mirrors `UserSubscriptionResponseDto` on the backend — `id` plus
 * the embedded `plan` are the FE's identity handles; we read `plan.id` rather
 * than carrying a separate `planId` because the backend never returns one at
 * the top level.
 *
 * Provider routing lives at the *envelope* level (`lockedProvider`) plus the
 * `capabilities` matrix below — not on this entity. The unified subscription
 * REST surface stopped emitting `provider` here once both rails went through
 * the same dispatcher, so a `provider` field on this schema would make Zod
 * reject every legitimate response and surface as contract drift in Sentry.
 *
 * `cancelledAt` is nullable — only set once the user requests cancel; benefits
 * continue until `currentPeriodEnd` regardless. Kept distinct from `status`
 * because a cancelled-but-still-active subscription is a valid state that the
 * UI needs to communicate differently from a fully expired one.
 */
/**
 * Slim plan reference used for the `pendingPlan` field on the active
 * subscription envelope. Carries just the bits the profile-side change
 * banner needs (name + price for copy) — keeps the wire payload tight
 * because the full plan entity already appears under `subscription.plan`
 * and a second copy would be redundant.
 */
const pendingPlanSchema = z.object({
	id: z.uuidv7(),
	name: z.string(),
	monthlyPriceAmount: z.string(),
});

const mySubscriptionSchema = z
	.object({
		id: z.uuidv7(),
		plan: subscriptionPlanSchema,
		status: subscriptionStatusSchema,
		currentPeriodEnd: z.iso.datetime(),
		cancelledAt: z.iso.datetime().nullable(),
		// Scheduled-change fields (Stripe-only today): `pendingPlan` is non-null
		// when the user queued a switch-at-renewal downgrade, with the effective
		// date in `pendingPlanEffectiveAt`. Both fall back to `null` for the
		// vast majority of subscriptions that have no pending swap queued.
		pendingPlan: pendingPlanSchema.nullable().optional(),
		pendingPlanEffectiveAt: z.iso.datetime().nullable().optional(),
	})
	// BE invariant: `pendingPlan` and `pendingPlanEffectiveAt` are populated as
	// a pair (both null = no queued swap; both non-null = swap queued for a
	// specific date). A half-populated shape would render an ambiguous UI —
	// banner gate uses both fields, dialog gate uses one. Catching it as
	// contract drift in Sentry is far safer than letting the UI silently
	// degrade into a "we know a change is queued but not when" state.
	.refine(
		data =>
			(data.pendingPlan == null && data.pendingPlanEffectiveAt == null) ||
			(data.pendingPlan != null && data.pendingPlanEffectiveAt != null),
		{
			message:
				'pendingPlan and pendingPlanEffectiveAt must be both null or both set',
			path: ['pendingPlanEffectiveAt'],
		},
	);

/**
 * Wire envelope for `GET /me/subscription`. The backend wraps the entity in
 * `{ subscription, capabilities, lockedProvider }` so a no-subscription state
 * is a successful 200 with `subscription: null` — not a 404. Parsing the
 * wrapper here means the server action can branch on `data.subscription === null`
 * instead of having to differentiate the not-found case from a transport-level 404.
 *
 * `lockedProvider` is null only for first-time buyers (no prior `user_subscriptions`
 * row). Once a user has ever subscribed it stays non-null even after churn so
 * the re-subscribe CTA renders the same provider's checkout — preventing a user
 * who started on Fanbasis from being silently migrated to Stripe (or vice versa)
 * on their second purchase.
 *
 * `capabilities` is null exactly when `lockedProvider` is null (no history → no
 * provider to derive capabilities from); non-null otherwise. The FE should treat
 * a null capabilities as "show pristine pricing page, no self-serve surface yet".
 */
export const mySubscriptionResponseSchema = z.object({
	subscription: mySubscriptionSchema.nullable(),
	capabilities: subscriptionCapabilitiesSchema.nullable(),
	lockedProvider: subscriptionProviderSchema.nullable(),
});

/**
 * FE payload for the subscribe action.
 *
 * Callers supply `planId` plus `provider` only — `successUrl` / `cancelUrl`
 * are required by the backend but the action constructs them server-side from
 * `APP_URL` to prevent open-redirect abuse via client-supplied URLs.
 *
 * `provider` is mandatory because the surface is provider-agnostic: the
 * dispatcher resolves Stripe vs Fanbasis from this discriminator (subject to
 * the user's `lockedProvider` once they have a history) and the FE must pick a
 * value before the network hop. Validating both shapes locally short-circuits
 * obviously-malformed input before the round-trip.
 */
export const subscribeToPlanPayloadSchema = z.object({
	planId: z.uuidv7(),
	provider: subscriptionProviderSchema,
});

/**
 * Response from `POST /subscriptions` — a hosted checkout URL the FE redirects
 * the user to (Stripe Checkout for Stripe, Fanbasis hosted-redirect for
 * Fanbasis), plus the resolved `provider` so post-redirect logic and analytics
 * can branch without re-deriving from the URL host. Anything else (customer
 * id, price id, etc.) stays on the backend to minimize surface.
 */
export const createSubscriptionResponseSchema = z.object({
	checkoutUrl: z.url(),
	provider: subscriptionProviderSchema,
});

/**
 * FE payload for the cancel-subscription action.
 *
 * Backend expects only the local subscription UUID; ownership and lifecycle
 * checks (must be active, not already cancelled) live server-side. The id is
 * carried as a path param on `DELETE /subscriptions/:id` — local `safeParse`
 * still runs because we interpolate the value into the URL and want a stale
 * cached page to fail fast without firing a malformed request.
 */
export const cancelSubscriptionPayloadSchema = z.object({
	subscriptionId: z.uuidv7(),
});

/**
 * Response from `DELETE /subscriptions/:id`. The endpoint performs a
 * cancel-at-period-end — the user keeps benefits until `expiresAt`, at which
 * point the row flips to `expired` via the lifecycle reconcile cron.
 *
 * `status` echoes the post-mutation lifecycle status (typically `cancelled`)
 * so the UI can reconcile its local view without a follow-up read.
 */
export const cancelSubscriptionResponseSchema = z.object({
	expiresAt: z.iso.datetime(),
	status: subscriptionStatusSchema,
});

/**
 * Response from `POST /me/billing-portal-sessions` — short-lived Stripe-hosted
 * URL for the Customer Portal where users self-serve cancel, plan switch,
 * payment method updates, and invoice history. The FE redirects the browser to
 * it (full-page nav) so Stripe can run its own UX without a same-origin frame.
 *
 * Mirrors `CreateBillingPortalResponseDto` on the backend — single `url`
 * field, deliberately kept narrow so we don't accidentally start consuming
 * Stripe customer/session ids on the FE.
 */
export const createBillingPortalResponseSchema = z.object({
	url: z.url(),
});

/**
 * Effective-at discriminator for the change-plan action.
 *
 * - `'now'`        — apply immediately. Stripe path returns an in-place
 *                    update; Fanbasis path mints a fresh hosted-checkout URL.
 * - `'period_end'` — schedule the swap for `currentPeriodEnd`. Stripe-only;
 *                    Fanbasis rejects with a `*-downgrade-unsupported` URN
 *                    that the UI guards against via `canScheduleDowngrade`.
 */
export const CHANGE_PLAN_EFFECTIVE = {
	NOW: 'now',
	PERIOD_END: 'period_end',
} as const;

export type ChangePlanEffective =
	(typeof CHANGE_PLAN_EFFECTIVE)[keyof typeof CHANGE_PLAN_EFFECTIVE];

const changePlanEffectiveSchema = z.enum([
	CHANGE_PLAN_EFFECTIVE.NOW,
	CHANGE_PLAN_EFFECTIVE.PERIOD_END,
]);

/**
 * FE payload for the change-plan action.
 *
 * `subscriptionId` lives in the path (`PATCH /subscriptions/:id`) but is
 * still validated locally so a non-UUID never leaks into a network URL.
 * `newPlanId` is the destination plan; `effective` discriminates between
 * apply-now and schedule-at-renewal. `successUrl` / `cancelUrl` are
 * optional in the local schema because the action constructs canonical
 * URLs from `APP_URL` (open-redirect rationale identical to subscribe).
 */
export const changePlanPayloadSchema = z.object({
	subscriptionId: z.uuidv7(),
	newPlanId: z.uuidv7(),
	effective: changePlanEffectiveSchema,
	successUrl: z.url().optional(),
	cancelUrl: z.url().optional(),
});

/**
 * Wire response for `PATCH /subscriptions/:id` — flat discriminated union
 * across the three outcomes the dispatcher can return today.
 *
 * - `in-place` — Stripe `'now'`. Atomic price swap; benefits flip
 *                immediately. `checkoutUrl` is `null`.
 * - `scheduled` — Stripe `'period_end'`. New plan effective at `effectiveAt`;
 *                 user keeps current benefits until then. `checkoutUrl` is `null`.
 * - `redirect` — Fanbasis `'now'`. Cancel-and-recreate; user must complete
 *                a fresh hosted checkout at `checkoutUrl`. `planId` / `planName`
 *                / `status` are `null` because the swap isn't durable yet.
 *
 * Kept as a single Zod union (one parse per response) rather than three
 * separate schemas so a renamed `kind` value lands as contract drift, not a
 * silent fallback to the next variant.
 */
const upsertChangePlanInPlaceSchema = z.object({
	kind: z.literal('in-place'),
	planId: z.uuidv7(),
	planName: z.string(),
	status: subscriptionStatusSchema,
	checkoutUrl: z.null(),
});

const upsertChangePlanScheduledSchema = z.object({
	kind: z.literal('scheduled'),
	planId: z.uuidv7(),
	planName: z.string(),
	effectiveAt: z.iso.datetime(),
	status: subscriptionStatusSchema,
	checkoutUrl: z.null(),
});

const upsertChangePlanRedirectSchema = z.object({
	kind: z.literal('redirect'),
	checkoutUrl: z.url(),
	planId: z.null(),
	planName: z.null(),
	status: z.null(),
});

export const upsertChangePlanResponseSchema = z.discriminatedUnion('kind', [
	upsertChangePlanInPlaceSchema,
	upsertChangePlanScheduledSchema,
	upsertChangePlanRedirectSchema,
]);

/**
 * Response from `DELETE /subscriptions/:id/scheduled-change` — confirms the
 * queued downgrade was removed. `'no-pending-change'` is the only legal
 * status today (idempotent: re-cancelling an already-clean subscription
 * still returns this success shape so the UI doesn't need a per-state branch).
 */
export const cancelScheduledChangeResponseSchema = z.object({
	status: z.literal('no-pending-change'),
});

export type PendingPlan = z.infer<typeof pendingPlanSchema>;
export type ChangePlanPayload = z.infer<typeof changePlanPayloadSchema>;
export type UpsertChangePlanResponseDto = z.infer<
	typeof upsertChangePlanResponseSchema
>;
export type CancelScheduledChangeResponse = z.infer<
	typeof cancelScheduledChangeResponseSchema
>;

export type SubscriptionPlan = z.infer<typeof subscriptionPlanSchema>;
export type SubscriptionPlansResponse = z.infer<
	typeof subscriptionPlansResponseSchema
>;
export type SubscribeToPlanPayload = z.infer<
	typeof subscribeToPlanPayloadSchema
>;
export type CreateSubscriptionResponse = z.infer<
	typeof createSubscriptionResponseSchema
>;
export type CreateBillingPortalResponse = z.infer<
	typeof createBillingPortalResponseSchema
>;
export type MySubscription = z.infer<typeof mySubscriptionSchema>;
export type MySubscriptionResponse = z.infer<
	typeof mySubscriptionResponseSchema
>;
export type SubscriptionCapabilities = z.infer<
	typeof subscriptionCapabilitiesSchema
>;
export type CancelSubscriptionPayload = z.infer<
	typeof cancelSubscriptionPayloadSchema
>;
export type CancelSubscriptionResponse = z.infer<
	typeof cancelSubscriptionResponseSchema
>;

/**
 * Subscription snapshot consumed by the ticket-purchase math + price breakdown.
 *
 * Mirrors the BE `ActiveSubscriptionInfoDto` minus identifiers — only the
 * discount %, an active flag, and the plan display name reach the client.
 * `planName` powers the price breakdown caption ("Saving $X with Premium")
 * and is null when the user has no active subscription.
 *
 * Lives in `@/types/subscription` so the inactive sentinel + the type are the
 * single source of truth shared by the React.cache-wrapped server fetch
 * (`getRaffleSubscriptionContext`) and the client purchase hook.
 */
export interface RaffleSubscriptionContext {
	readonly discountPercent: number;
	readonly isActive: boolean;
	readonly planName: string | null;
	/**
	 * True when the subscription is in `past_due` dunning (payment failed,
	 * benefits retained until the period lapses). Drives the red "renew"
	 * notice in the raffle entry block, swapped in for the green subscriber
	 * banner — distinct from a healthy `active` subscription.
	 */
	readonly isPastDue: boolean;
}

/** Sentinel used for guests / fetch failures / expired subscriptions. */
export const INACTIVE_SUBSCRIPTION_CONTEXT: RaffleSubscriptionContext = {
	discountPercent: 0,
	isActive: false,
	planName: null,
	isPastDue: false,
};
