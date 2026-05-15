/**
 * Subscribe-page shared module — surface-level constants that don't vary
 * per plan. Per-plan figures (charge, payout, badge text) live in
 * `./plans.ts`; this module owns identifiers shared across every tier so
 * the in-page CTA anchor and post-payment landing path stay in one spot.
 */

/**
 * Better-Auth magic-link callback — "credits claimed!" confirmation page.
 *
 * Fanbasis appends nothing on its hosted-page redirect, so this path is
 * configured server-side as the `success_url` on the checkout session and
 * Fanbasis bounces the buyer back here after a successful charge. Once the
 * backend webhook is reconnected, the magic-link email lands here too —
 * for now it renders a "payment captured / awaiting magic link"
 * confirmation only.
 */
export const CREDITS_CLAIMED_PATH = '/credits-claimed';

/**
 * Anchor id on the hero section. Exported so any in-page CTA that wants to
 * scroll back to the signup form references a single source of truth — if
 * the hero section id is ever renamed, every `<a href="#...">` updates at
 * the same time.
 */
export const SUBSCRIBE_HERO_ANCHOR_ID = 'subscribe-hero';
