/**
 * Subscribe-page offer constants.
 *
 * Hoisted into a single module so hero / credit-purchase-card /
 * cta-section all read the same figures. When the pricing service lands
 * a real "$10 credit purchase" SKU, swap these literals for the service
 * call result and the three surfaces pick it up without further edits.
 */

/** Amount the visitor pays (USD). Appears in hero + credit card + CTA copy. */
export const CREDIT_CHARGE_USD = 10;

/** Credit balance awarded after the charge (USD). The "+$1 bonus" hook. */
export const CREDIT_PAYOUT_USD = 11;

/**
 * Better-Auth magic-link callback — "credits claimed!" confirmation page.
 *
 * The embedded Fanbasis SDK fires `checkout:success` after a charge
 * captures, and `credit-purchase-card.tsx` navigates the same tab to this path.
 * Once the backend webhook is reconnected, the magic-link email lands
 * here too (with `?session=<id>`); for now it is a "payment captured"
 * confirmation only — credits are not yet provisioned in this mode.
 */
export const CREDITS_CLAIMED_PATH = '/credits-claimed';

/**
 * Anchor id on the hero section. Exported so any in-page CTA that wants to
 * scroll back to the signup form references a single source of truth — if
 * the hero section id is ever renamed, every `<a href="#...">` updates at
 * the same time.
 */
export const SUBSCRIBE_HERO_ANCHOR_ID = 'subscribe-hero';
