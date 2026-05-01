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
 */
const subscriptionPlanSchema = z.object({
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
 * `cancelledAt` is nullable — only set once the user requests cancel; benefits
 * continue until `currentPeriodEnd` regardless. Kept distinct from `status`
 * because a cancelled-but-still-active subscription is a valid state that the
 * UI needs to communicate differently from a fully expired one.
 */
const mySubscriptionSchema = z.object({
	id: z.uuidv7(),
	plan: subscriptionPlanSchema,
	status: subscriptionStatusSchema,
	currentPeriodEnd: z.iso.datetime(),
	cancelledAt: z.iso.datetime().nullable(),
});

/**
 * Wire envelope for `GET /me/subscription`. The backend wraps the entity in
 * `{ subscription: ... | null }` so a no-subscription state is a successful
 * 200 with a null payload — not a 404. Parsing the wrapper here means the
 * server action can branch on `data.subscription === null` instead of having
 * to differentiate the not-found case from a transport-level 404.
 */
export const mySubscriptionResponseSchema = z.object({
	subscription: mySubscriptionSchema.nullable(),
});

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

/**
 * Response from `POST /subscriptions/portal` — short-lived Stripe-hosted URL
 * for the Customer Portal where users self-serve cancel, plan switch, payment
 * method updates, and invoice history. The FE redirects the browser to it
 * (full-page nav) so Stripe can run its own UX without a same-origin frame.
 *
 * Mirrors `CreateBillingPortalResponseDto` on the backend — single `url`
 * field, deliberately kept narrow so we don't accidentally start consuming
 * Stripe customer/session ids on the FE.
 */
export const createBillingPortalResponseSchema = z.object({
	url: z.url(),
});

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
}

/** Sentinel used for guests / fetch failures / expired subscriptions. */
export const INACTIVE_SUBSCRIPTION_CONTEXT: RaffleSubscriptionContext = {
	discountPercent: 0,
	isActive: false,
	planName: null,
};
