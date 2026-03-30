/**
 * Mixpanel Analytics Event Constants
 *
 * Centralized event definitions for tracking user interactions.
 * Server-side tracking handles business-critical events (more accurate, ad-blocker resistant).
 * Client-side autocapture handles UX events (clicks, scrolls, page views).
 *
 * Naming convention: Title Case
 * - Each word capitalized, spaces between words
 * - Past tense for completed actions (e.g., Sign Up Completed)
 * - Present tense for started/ongoing actions (e.g., Checkout Started)
 */

/**
 * Authentication events
 * Tracked server-side for accuracy (15-30% more reliable than client-side)
 */
export const AUTH_EVENTS = {
	/** User initiated sign-up flow */
	SIGN_UP_STARTED: 'Sign Up Started',
	/** User successfully created account */
	SIGN_UP_COMPLETED: 'Sign Up Completed',
	/** Sign-up attempt failed (includes error_code property) */
	SIGN_UP_FAILED: 'Sign Up Failed',
	/** User initiated sign-in flow */
	SIGN_IN_STARTED: 'Sign In Started',
	/** User successfully authenticated */
	SIGN_IN_COMPLETED: 'Sign In Completed',
	/** Sign-in attempt failed (includes error_code property) */
	SIGN_IN_FAILED: 'Sign In Failed',
	/** User signed out */
	SIGN_OUT: 'Sign Out',
} as const;

/**
 * Navigation events
 * Handled by Mixpanel autocapture - manual tracking not needed
 */
export const NAV_EVENTS = {
	/** Page view event (autocapture handles this) */
	PAGE_VIEW: 'Page View',
} as const;

/**
 * Raffle lifecycle events
 * Tracked server-side for business-critical actions
 */
export const RAFFLE_EVENTS = {
	/** User viewed a raffle detail page */
	VIEWED: 'Raffle Viewed',
	/** User filtered raffle list */
	LIST_FILTERED: 'Raffle List Filtered',
	/** User sorted raffle list */
	LIST_SORTED: 'Raffle List Sorted',
	/** User shared a raffle */
	SHARED: 'Raffle Shared',
	/** User started raffle creation wizard */
	CREATE_STARTED: 'Raffle Create Started',
	/** User completed a step in creation wizard */
	CREATE_STEP_COMPLETED: 'Raffle Create Step Completed',
	/** Raffle successfully created */
	CREATED: 'Raffle Created',
	/** Raffle creation failed (includes error_code property) */
	CREATE_FAILED: 'Raffle Create Failed',
	/** Cover image uploaded to raffle */
	COVER_UPLOADED: 'Raffle Cover Uploaded',
	/** Gallery images uploaded to raffle */
	GALLERY_UPLOADED: 'Raffle Gallery Uploaded',
	/** Host published a draft raffle to live/queued */
	PUBLISHED: 'Raffle Published',
	/** Host reverted a published raffle back to draft */
	UNPUBLISHED: 'Raffle Unpublished',
	/** Host updated a draft raffle */
	UPDATED: 'Raffle Updated',
	/** Host posted an update to raffle participants */
	UPDATE_POSTED: 'Raffle Update Posted',
} as const;

/**
 * Purchase flow events
 * Tracked server-side - critical for revenue attribution
 */
export const PURCHASE_EVENTS = {
	/** User initiated purchase flow */
	STARTED: 'Purchase Started',
	/** Order successfully created (pending payment) */
	ORDER_CREATED: 'Order Created',
	/** Order creation failed (includes error_code property) */
	ORDER_FAILED: 'Order Failed',
	/** Stripe checkout session initiated */
	CHECKOUT_STARTED: 'Checkout Started',
	/** Payment completed successfully (Stripe or crypto) */
	COMPLETED: 'Purchase Completed',
	/** Checkout/payment failed (includes error_code property) */
	FAILED: 'Purchase Failed',
	/** Crypto checkout session created atomically with order */
	CRYPTO_CHECKOUT_STARTED: 'Crypto Checkout Started',
	/** Crypto transaction hash submitted for verification */
	CRYPTO_TX_SUBMITTED: 'Crypto Transaction Submitted',
	/** Crypto transaction confirmed on-chain and payment finalized */
	CRYPTO_TX_CONFIRMED: 'Crypto Transaction Confirmed',
	/** User abandoned a pending order without completing payment */
	ORDER_ABANDONED: 'Order Abandoned',
} as const;

/**
 * Promo code events
 * Tracked server-side - measures promo effectiveness and revenue impact
 */
export const PROMO_CODE_EVENTS = {
	/** Promo code successfully validated (includes validity result) */
	VALIDATED: 'Promo Code Validated',
	/** Promo code successfully redeemed (discount applied or tickets granted) */
	REDEEMED: 'Promo Code Redeemed',
	/** Host bulk created promo codes for a raffle */
	BULK_CREATED: 'Promo Codes Created',
} as const;

/**
 * Winning/fulfillment events
 * Tracked server-side - measures fulfillment speed and trust
 */
export const WINNING_EVENTS = {
	/** Host marked prize as sent with proof URL */
	MARKED_SENT: 'Prize Marked Sent',
	/** Host marked prize as delivered (starts 48hr auto-confirm) */
	MARKED_DELIVERED: 'Prize Marked Delivered',
} as const;

/**
 * Profile events
 * User profile interactions
 */
export const PROFILE_EVENTS = {
	/** User viewed their profile */
	VIEWED: 'Profile Viewed',
	/** User switched between host and participant mode */
	MODE_SWITCHED: 'Mode Switched',
} as const;
