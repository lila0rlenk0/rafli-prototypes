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

// =============================================================================
// Status enum — mirrors backend `subscription_status_enum` exactly
// =============================================================================

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

export const subscriptionStatusSchema = z.enum([
	SUBSCRIPTION_STATUS.ACTIVE,
	SUBSCRIPTION_STATUS.CANCELLED,
	SUBSCRIPTION_STATUS.PAST_DUE,
	SUBSCRIPTION_STATUS.EXPIRED,
]);

// =============================================================================
// Plan schemas
// =============================================================================

/**
 * Single feature bullet rendered inside a plan card.
 *
 * `tag` is an optional highlight label like "LIMITED OFFER" or "NEW" that
 * sits next to the feature text on the card — Ops sets it in the plan
 * metadata. `.nullable()` mirrors the backend DTO (`null | string`) rather
 * than omitting the key; matching the wire shape keeps parse errors honest.
 */
export const subscriptionPlanFeatureSchema = z.object({
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
export const subscriptionPlanMetadataSchema = z.object({
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
 */
export const subscriptionPlanSchema = z.object({
	id: z.uuidv7(),
	name: z.string(),
	monthlyPriceAmount: z.string(),
	creditAmount: z.string(),
	discountPercent: z.number(),
	metadata: subscriptionPlanMetadataSchema,
});

/** Response shape for `GET /subscriptions/plans` — always wrapped in `plans`. */
export const subscriptionPlansResponseSchema = z.object({
	plans: z.array(subscriptionPlanSchema),
});

// =============================================================================
// My-subscription schema — the authenticated user's current subscription
// =============================================================================

/**
 * The authenticated user's current subscription as returned by
 * `GET /subscriptions/me`.
 *
 * Design choice: the backend embeds the full `SubscriptionPlan` entity rather
 * than returning just a `planId`. Embedding lets every consumer (dialog, nav
 * badge, pricing card "current" state) render tier visuals, price, feature
 * list, etc. without a second round-trip, and it collapses to a single cache
 * key in React Query. The small bandwidth cost is acceptable because the
 * `/me` payload is fetched at most a couple of times per session.
 *
 * `cancelledAt` is nullable — only set once the user requests cancel; benefits
 * continue until `currentPeriodEnd` regardless. Kept distinct from `status`
 * because a cancelled-but-still-active subscription is a valid state that the
 * UI needs to communicate differently from a fully expired one.
 */
export const mySubscriptionSchema = z.object({
	id: z.uuidv7(),
	planId: z.uuidv7(),
	plan: subscriptionPlanSchema,
	status: subscriptionStatusSchema,
	currentPeriodEnd: z.iso.datetime(),
	cancelledAt: z.iso.datetime().nullable(),
});

// =============================================================================
// Subscribe payload + response
// =============================================================================

/**
 * FE payload for the subscribe action.
 *
 * We only accept `planId` from callers — the backend requires `successUrl` /
 * `cancelUrl` too, but those are constructed server-side from `APP_URL` to
 * prevent open-redirect abuse via client-supplied URLs. Validating the id
 * shape client-side lets us short-circuit bogus requests before the network
 * call (keeping Sentry quiet and Stripe happy).
 */
export const subscribeToPlanPayloadSchema = z.object({
	planId: z.uuidv7(),
});

/**
 * Response from `POST /subscriptions/subscribe` — a Stripe-hosted checkout
 * URL that the FE redirects the user to. Anything else (customer id, price
 * id, etc.) is deliberately kept on the backend to minimize surface.
 */
export const createSubscriptionResponseSchema = z.object({
	checkoutUrl: z.url(),
});

// =============================================================================
// Inferred types
// =============================================================================

export type SubscriptionPlanFeature = z.infer<
	typeof subscriptionPlanFeatureSchema
>;
export type SubscriptionPlanMetadata = z.infer<
	typeof subscriptionPlanMetadataSchema
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
export type MySubscription = z.infer<typeof mySubscriptionSchema>;
