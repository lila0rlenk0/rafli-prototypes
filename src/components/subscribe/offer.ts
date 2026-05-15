/**
 * Subscribe-page shared module — surface-level constants that don't vary
 * per plan. Per-plan figures (charge, payout, badge text) live in
 * `./plans.ts`; this module owns identifiers shared across every tier so
 * the in-page CTA anchor stays in one spot.
 */

/**
 * Anchor id on the hero section. Exported so any in-page CTA that wants to
 * scroll back to the signup form references a single source of truth — if
 * the hero section id is ever renamed, every `<a href="#...">` updates at
 * the same time.
 */
export const SUBSCRIBE_HERO_ANCHOR_ID = 'subscribe-hero';
