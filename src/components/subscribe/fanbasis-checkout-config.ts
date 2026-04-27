import type {
	CheckoutConfig,
	CustomizationParams,
} from '@fanbasis/checkout-react';

import type { FanbasisPublicCreditCheckoutResponse } from '@/services/payment/create-fanbasis-public-credit-checkout';

// =============================================================================
// FANBASIS THEME CONFIG
// =============================================================================

/**
 * `CustomizationParams` block forwarded to `<CheckoutProvider>` via
 * the `theme` field of `CheckoutConfig`. Drives the iframe's internal
 * palette (input fills, label colors, submit button) so the embedded
 * card-entry surface matches the surrounding /subscribe chrome.
 *
 * Hex literals (not Tailwind tokens) are deliberate: the third-party
 * iframe SDK only accepts hex strings — `tailwind-v4.md`'s
 * "no arbitrary colours" rule applies to our DOM, not to the values we
 * hand to a sandboxed iframe whose internal CSS we never see.
 *
 * Palette pulled directly from the Figma mock:
 * - inputs: stone-100 fill (#f5f5f4) + gray-200 hairline (#e5e7eb)
 * - submit button: rafli-black (#141416)
 * - labels: neutral-500 (#737373)
 * - body ink: rafli-black (#141416)
 *
 * `show_product_info: false` because our chrome already shows the
 * offer-details band above the iframe — letting Fanbasis render its
 * own product card would duplicate the disclosure line. Same logic for
 * `show_headings: false` (we own the green header) and
 * `show_powered_by: false` (keeps the iframe's bottom edge clean).
 *
 * `show_coupon_row: false` because the landing flow has no coupon
 * surface — the offer is a single fixed price. Re-enable when /subscribe
 * grows a referral-code experiment.
 *
 * Module-level constant because the palette is static — no prop or
 * state drives any field today, so holding the reference outside the
 * render loop is the cheapest way to guarantee `<CheckoutProvider>`
 * never re-inits the iframe just because the parent re-rendered.
 */
const FANBASIS_THEME: CustomizationParams = {
	theme: 'light',
	show_product_info: false,
	product_layout: 'above',
	show_coupon_row: false,
	accent_color: '#141416',
	background_color: '#ffffff',
	input_background_color: '#f5f5f4',
	border_color: '#e5e7eb',
	label_color: '#737373',
	heading_color: '#141416',
	product_text_color: '#141416',
	secondary_color: '#737373',
	surface_color: '#ffffff',
	billing_form_placement: 'above',
	show_headings: false,
	show_powered_by: false,
};

/**
 * Explicit iframe dimensions for the embedded checkout container.
 *
 * Fanbasis does not infer the iframe height from our surrounding card slot;
 * without this config the iframe can fall back to the browser default
 * 300x150 box and clip payment fields. Width stays fluid to match the
 * responsive card, while 420px covers the default email + billing form stack.
 */
const FANBASIS_CONTAINER_OPTIONS = {
	width: '100%',
	height: '420px',
} as const;

/**
 * Builds the minimal Fanbasis SDK config for the anonymous public-credit flow.
 *
 * The backend owns the four required fields from the docs: `creatorId`,
 * `productId`, `checkoutSessionSecret`, and `environment`. This function
 * deliberately omits optional extensions (`prefill`, `fields`, `collectPhone`,
 * `metadata`, `redirectSettings`) because the iframe collects buyer details
 * itself and this fixed-price landing flow has no trusted local user context
 * before Fanbasis submission.
 *
 * @param session - Backend-minted embedded checkout session
 * @returns Fanbasis checkout config consumed by `<CheckoutProvider>`
 */
export function buildFanbasisCheckoutConfig(
	session: FanbasisPublicCreditCheckoutResponse,
): CheckoutConfig {
	return {
		creatorId: session.creatorId,
		productId: session.productId,
		checkoutSessionSecret: session.checkoutSessionSecret,
		environment: session.environment,
		theme: FANBASIS_THEME,
		containerOptions: FANBASIS_CONTAINER_OPTIONS,
	};
}
