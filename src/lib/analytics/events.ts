/**
 * Mixpanel Analytics Event Constants
 *
 * Centralized event definitions for tracking user interactions.
 * Server-side tracking handles business-critical events (more accurate, ad-blocker resistant).
 * Client-side autocapture handles UX events (clicks, scrolls, page views).
 *
 * Naming convention: <domain>_<action>
 * - Lowercase with underscores
 * - Past tense for completed actions (e.g., sign_up_completed)
 * - Present tense for started/ongoing actions (e.g., checkout_started)
 */

/**
 * Authentication events
 * Tracked server-side for accuracy (15-30% more reliable than client-side)
 */
export const AUTH_EVENTS = {
	/** User initiated sign-up flow */
	SIGN_UP_STARTED: 'sign_up_started',
	/** User successfully created account */
	SIGN_UP_COMPLETED: 'sign_up_completed',
	/** Sign-up attempt failed (includes error_code property) */
	SIGN_UP_FAILED: 'sign_up_failed',
	/** User initiated sign-in flow */
	SIGN_IN_STARTED: 'sign_in_started',
	/** User successfully authenticated */
	SIGN_IN_COMPLETED: 'sign_in_completed',
	/** Sign-in attempt failed (includes error_code property) */
	SIGN_IN_FAILED: 'sign_in_failed',
	/** User signed out */
	SIGN_OUT: 'sign_out',
} as const;

/**
 * Navigation events
 * Handled by Mixpanel autocapture - manual tracking not needed
 */
export const NAV_EVENTS = {
	/** Page view event (autocapture handles this) */
	PAGE_VIEW: 'page_view',
} as const;

/**
 * Raffle lifecycle events
 * Tracked server-side for business-critical actions
 */
export const RAFFLE_EVENTS = {
	/** User viewed a raffle detail page */
	VIEWED: 'raffle_viewed',
	/** User filtered raffle list */
	LIST_FILTERED: 'raffle_list_filtered',
	/** User sorted raffle list */
	LIST_SORTED: 'raffle_list_sorted',
	/** User shared a raffle */
	SHARED: 'raffle_shared',
	/** User started raffle creation wizard */
	CREATE_STARTED: 'raffle_create_started',
	/** User completed a step in creation wizard */
	CREATE_STEP_COMPLETED: 'raffle_create_step_completed',
	/** Raffle successfully created */
	CREATED: 'raffle_created',
	/** Raffle creation failed (includes error_code property) */
	CREATE_FAILED: 'raffle_create_failed',
	/** Cover image uploaded to raffle */
	COVER_UPLOADED: 'raffle_cover_uploaded',
	/** Gallery images uploaded to raffle */
	GALLERY_UPLOADED: 'raffle_gallery_uploaded',
} as const;

/**
 * Purchase flow events
 * Tracked server-side - critical for revenue attribution
 */
export const PURCHASE_EVENTS = {
	/** User initiated purchase flow */
	STARTED: 'purchase_started',
	/** Order successfully created (pending payment) */
	ORDER_CREATED: 'order_created',
	/** Order creation failed (includes error_code property) */
	ORDER_FAILED: 'order_failed',
	/** Stripe checkout session initiated */
	CHECKOUT_STARTED: 'checkout_started',
	/** Payment completed successfully */
	COMPLETED: 'purchase_completed',
	/** Checkout/payment failed (includes error_code property) */
	FAILED: 'purchase_failed',
} as const;

/**
 * Profile events
 * User profile interactions
 */
export const PROFILE_EVENTS = {
	/** User viewed their profile */
	VIEWED: 'profile_viewed',
	/** User switched between host and participant mode */
	MODE_SWITCHED: 'mode_switched',
} as const;
