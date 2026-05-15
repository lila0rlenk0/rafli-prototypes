import { createStore } from 'zustand/vanilla';

import { PROMO_CODE_TYPE, type ValidatedPromoCode } from '@/types/promo-code';

// --- State & Action interfaces ---
// Separated so the provider can type the initial state without actions.
//
// Why this store exists:
// - On mobile, the bundle quick-pick buttons live inside the fixed sticky CTA
//   at the bottom of the viewport, while the counter input lives inside the
//   inline `TicketPurchaseCard`. Both subtrees need to read and write the same
//   `quantity` value, and they sit in distant branches of the page tree.
// - The mobile sticky CTA "One Time Purchase" button drives the same Stripe checkout
//   flow as the desktop in-card BuyButton via the shared `useStripeCheckout`
//   hook. That hook needs to read both `quantity` and `appliedPromo` to build
//   the order. Promo state can't live in the card alone — the sticky needs to
//   reflect the discounted total in its inline price label and pass the promo
//   code into the checkout call.
//
// Naming note: file is still `ticket-quantity-store` for minimal churn, but
// the store now also owns promo-code state. Rename deferred until/unless a
// second store with overlapping concerns appears.

export interface TicketQuantityStoreState {
	readonly quantity: number;
	readonly appliedPromo: ValidatedPromoCode | null;
	/**
	 * Monotonically increasing counter that re-mounts the `PromoCodeInput`
	 * via React's `key` prop when promo state is cleared from outside the
	 * input (e.g. backend says invalid, post-redemption cleanup, sticky
	 * checkout failure). The input itself only knows how to clear its own
	 * draft on `onClear` — external invalidation needs a re-mount signal.
	 */
	readonly promoResetVersion: number;
	/**
	 * Access Pass acknowledgment — required before paid checkout can open
	 * the payment-method picker. Legal framing: the user is purchasing
	 * platform access that includes bonus raffle entries, NOT a raffle
	 * ticket. The checkbox captures explicit intent before checkout and is
	 * scoped per-raffle page mount (store is created fresh each time the
	 * provider mounts), so every raffle visit surfaces the disclaimer again
	 * — a transient consent that does not carry across sessions or raffles.
	 *
	 * Gate moved upstream to the "One Time Purchase" trigger: the tender
	 * buttons inside the picker no longer self-disable on this flag — once
	 * the picker is open, the user has already passed the consent check.
	 */
	readonly isAccessPassAcknowledged: boolean;
	/**
	 * Whether to surface the inline form-style error under the
	 * acknowledgment checkbox. Flipped true by the "One Time Purchase"
	 * trigger when the user attempts checkout without ticking the box,
	 * cleared automatically the moment they tick it.
	 */
	readonly acknowledgmentError: boolean;
	/**
	 * Monotonic counter the `AccessPassAcknowledgment` component watches
	 * to trigger `scrollIntoView` on its wrapper. Mobile users click the
	 * sticky bottom CTA without seeing the checkbox above; bumping this
	 * nonce moves the viewport to the checkbox so the user can act on the
	 * error message we just surfaced. Nonce (not a boolean) because the
	 * same scroll request can fire twice in a row — the effect needs to
	 * re-trigger on every bump.
	 */
	readonly acknowledgmentScrollNonce: number;
	/**
	 * Payment-method picker visibility. Hoisted to the shared store so the
	 * desktop in-card "One Time Purchase" button and the mobile sticky CTA
	 * — which live in different React subtrees — can both open the same
	 * single modal instance hosted by `TicketPurchaseCard`. Without this,
	 * each surface would need its own modal copy and the post-purchase
	 * confirmation handoff would have to be duplicated.
	 */
	readonly isPaymentMethodModalOpen: boolean;
	/**
	 * Entries-confirmed celebration visibility. Picker closes and this
	 * flips true when a tender path settles synchronously (currently the
	 * credits flow). Shared with the sticky-driven mobile flow so the
	 * confirmation modal renders regardless of which surface launched the
	 * picker.
	 */
	readonly isEntriesConfirmedModalOpen: boolean;
}

export interface TicketQuantityStoreActions {
	readonly setQuantity: (quantity: number) => void;
	readonly incrementBy: (amount: number, max?: number) => void;
	readonly reset: () => void;
	readonly applyPromo: (promo: ValidatedPromoCode) => void;
	readonly clearPromo: () => void;
	readonly setAccessPassAcknowledged: (acknowledged: boolean) => void;
	/**
	 * Trigger the "tick the acknowledgment" flow: scrolls the checkbox
	 * into view and surfaces the inline error. Idempotent — re-calling
	 * just bumps the scroll nonce so the effect re-fires (useful when the
	 * user keeps tapping the CTA without ticking the box).
	 */
	readonly requestAcknowledgment: () => void;
	readonly setPaymentMethodModalOpen: (open: boolean) => void;
	readonly setEntriesConfirmedModalOpen: (open: boolean) => void;
	/**
	 * Atomic handoff used by tender paths that settle while still on this
	 * page (credits today). Combining the two flips into one action keeps
	 * the picker close + confirmation open in the same store update,
	 * avoiding an intermediate frame where neither modal is open.
	 */
	readonly handlePurchaseSettled: () => void;
}

export type TicketQuantityStore = TicketQuantityStoreState &
	TicketQuantityStoreActions;

/** Default state — quantity starts at 1, acknowledgment resets per raffle mount */
export const defaultInitState: Readonly<TicketQuantityStoreState> = {
	quantity: 1,
	appliedPromo: null,
	promoResetVersion: 0,
	isAccessPassAcknowledged: false,
	acknowledgmentError: false,
	acknowledgmentScrollNonce: 0,
	isPaymentMethodModalOpen: false,
	isEntriesConfirmedModalOpen: false,
};

/**
 * Creates a vanilla Zustand store for the raffle checkout state on the
 * detail page. Vanilla (non-React) so the provider owns the single instance
 * and passes it via context — follows the createStore + provider pattern
 * used elsewhere in the project.
 *
 * @param initState - Initial state for the store
 * @returns Zustand vanilla store instance
 */
export function createTicketQuantityStore(
	initState: TicketQuantityStoreState = defaultInitState,
) {
	return createStore<TicketQuantityStore>()((set, get) => ({
		...initState,

		setQuantity: quantity => {
			// Floor protects against decimals from `parseInt` edge cases and
			// ensures the store never holds a fractional ticket count.
			const next = Math.max(1, Math.floor(quantity));
			set({ quantity: next });
		},

		// Convenience for additive bundle buttons (+10/+25/+50). Optional `max`
		// clamps to availableTickets so quick-picks can't overshoot the cap.
		incrementBy: (amount, max) => {
			const current = get().quantity;
			const proposed = current + Math.floor(amount);
			// `max === 0` means unlimited participants — skip clamping in that case.
			const clamped = max && max > 0 ? Math.min(proposed, max) : proposed;
			set({ quantity: Math.max(1, clamped) });
		},

		// Reset to baseline — used by promo clear handlers and on raffle change.
		reset: () => {
			set({ quantity: 1 });
		},

		// Applying a promo locks quantity to the granted count for free-tickets
		// promos so the displayed total and the order payload always match the
		// promo's intent. Discount promos leave quantity untouched.
		applyPromo: promo => {
			if (promo.type === PROMO_CODE_TYPE.FREE_TICKETS) {
				const grantedCount = Math.max(1, Math.floor(parseFloat(promo.value)));
				set({ appliedPromo: promo, quantity: grantedCount });
				return;
			}
			set({ appliedPromo: promo });
		},

		// Clear: drops the promo, bumps the reset version (so PromoCodeInput
		// re-mounts and clears its draft), and resets quantity *only* when the
		// cleared promo was free-tickets — otherwise we keep the user's manual
		// selection. Mirrors the original `handlePromoInvalid` semantics from
		// `TicketPurchaseCard`, which is the union of the auto-invalidation,
		// post-redemption, and sticky-checkout-failure paths.
		clearPromo: () => {
			const wasFreeTickets =
				get().appliedPromo?.type === PROMO_CODE_TYPE.FREE_TICKETS;
			set(state => ({
				appliedPromo: null,
				promoResetVersion: state.promoResetVersion + 1,
				quantity: wasFreeTickets ? 1 : state.quantity,
			}));
		},

		// Ticking clears any stale error — the gate is now satisfied. Both
		// triggers (desktop card + mobile sticky) read this flag straight
		// from the store, no prop drilling.
		setAccessPassAcknowledged: acknowledged =>
			set(state => ({
				isAccessPassAcknowledged: acknowledged,
				acknowledgmentError: acknowledged ? false : state.acknowledgmentError,
			})),

		// Bump nonce unconditionally so repeated taps re-trigger the
		// `scrollIntoView` effect — relevant on mobile where the user may
		// have scrolled away since the prior request.
		requestAcknowledgment: () =>
			set(state => ({
				acknowledgmentError: true,
				acknowledgmentScrollNonce: state.acknowledgmentScrollNonce + 1,
			})),

		setPaymentMethodModalOpen: open => {
			set({ isPaymentMethodModalOpen: open });
		},

		setEntriesConfirmedModalOpen: open => {
			set({ isEntriesConfirmedModalOpen: open });
		},

		// Atomic close-picker + open-confirmation so React commits both flips
		// in one paint — otherwise a stray frame can show neither modal, which
		// reads as a "what just happened?" hiccup right after the tender settles.
		handlePurchaseSettled: () => {
			set({
				isPaymentMethodModalOpen: false,
				isEntriesConfirmedModalOpen: true,
			});
		},
	}));
}
