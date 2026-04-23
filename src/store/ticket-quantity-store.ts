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
// - The mobile sticky CTA "Enter now" button drives the same Stripe checkout
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
	 * Access Pass acknowledgment — required before any paid buy CTA is
	 * clickable. Legal framing: the user is purchasing platform access that
	 * includes bonus raffle entries, NOT a raffle ticket. The checkbox
	 * captures explicit intent before checkout and must be scoped per-raffle
	 * page mount (store is created fresh each time the provider mounts), so
	 * every raffle visit surfaces the disclaimer again — a transient consent
	 * that does not carry across sessions or raffles.
	 */
	readonly isAccessPassAcknowledged: boolean;
}

export interface TicketQuantityStoreActions {
	readonly setQuantity: (quantity: number) => void;
	readonly incrementBy: (amount: number, max?: number) => void;
	readonly reset: () => void;
	readonly applyPromo: (promo: ValidatedPromoCode) => void;
	readonly clearPromo: () => void;
	readonly setAccessPassAcknowledged: (acknowledged: boolean) => void;
}

export type TicketQuantityStore = TicketQuantityStoreState &
	TicketQuantityStoreActions;

/** Default state — quantity starts at 1, acknowledgment resets per raffle mount */
export const defaultInitState: Readonly<TicketQuantityStoreState> = {
	quantity: 1,
	appliedPromo: null,
	promoResetVersion: 0,
	isAccessPassAcknowledged: false,
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

		// Toggle Access Pass acknowledgment from the checkbox rendered inside
		// `TicketPurchaseCard`. Both the desktop BuyButton and the mobile
		// StickyBuyTicketsCta subscribe to `isAccessPassAcknowledged` and
		// disable themselves until this flips to true — single source of truth
		// for the legal consent gate across breakpoints, no prop drilling.
		setAccessPassAcknowledged: acknowledged => {
			set({ isAccessPassAcknowledged: acknowledged });
		},
	}));
}
