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
	/** User initiated sign-up flow (form submitted, before API call) */
	SIGN_UP_STARTED: 'Sign Up Started',
	/** User successfully created account */
	SIGN_UP_COMPLETED: 'Sign Up Completed',
	/** Sign-up attempt failed (includes error_code property) */
	SIGN_UP_FAILED: 'Sign Up Failed',
	/** User initiated sign-in flow (form submitted, before API call) */
	SIGN_IN_STARTED: 'Sign In Started',
	/** User successfully authenticated */
	SIGN_IN_COMPLETED: 'Sign In Completed',
	/** Sign-in attempt failed (includes error_code property) */
	SIGN_IN_FAILED: 'Sign In Failed',
	/** User signed out */
	SIGN_OUT: 'Sign Out',
} as const;

/**
 * Raffle lifecycle events
 * Tracked server-side for business-critical actions
 */
export const RAFFLE_EVENTS = {
	/** User viewed a raffle detail page */
	VIEWED: 'Raffle Viewed',
	/** User shared a raffle (includes method: twitter/copy_link) */
	SHARED: 'Raffle Shared',
	/** User filtered raffle list (category or sort changed) */
	FILTERED: 'Raffle Filtered',
	/** User answered a raffle gating question */
	QUESTION_ANSWERED: 'Raffle Question Answered',
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
 * X Share events
 * Tracked client/server-side — measures share-for-free-ticket funnel
 */
export const X_SHARE_EVENTS = {
	/** User initiated X share intent (tokenized flow) */
	INTENT_CREATED: 'X Share Intent Created',
	/** User's X share was verified and free ticket granted */
	VERIFIED: 'X Share Verified',
	/**
	 * Lax-review verify deferred — X's recent-search index hadn't picked up the
	 * tweet yet. User is asked to retry after the cooldown. Distinguished from
	 * VERIFICATION_FAILED so we don't pollute the failure funnel with normal
	 * index-lag retries; budget exhaustion folds back into VERIFIED.
	 */
	VERIFICATION_DEFERRED: 'X Share Verification Deferred',
	/** X share verification failed (includes reason) */
	VERIFICATION_FAILED: 'X Share Verification Failed',
} as const;

/**
 * Purchase flow events
 * Tracked server-side — critical for revenue attribution
 */
export const PURCHASE_EVENTS = {
	/** User clicked buy/checkout button — intent to purchase before order creation */
	TICKET_SELECTION_VIEWED: 'Ticket Selection Viewed',
	/** User initiated purchase flow (order creation started) */
	STARTED: 'Purchase Started',
	/** Order successfully created (pending payment) */
	ORDER_CREATED: 'Order Created',
	/** Order creation failed (includes error_code property) */
	ORDER_FAILED: 'Order Failed',
	/** Stripe checkout session initiated */
	CHECKOUT_STARTED: 'Checkout Started',
	/** Payment completed successfully (Stripe, crypto, or credits) */
	COMPLETED: 'Purchase Completed',
	/** Checkout/payment failed (includes error_code, payment_method) */
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
 * Subscription events
 * Tracked server-side — covers the `POST /subscriptions` mutation lifecycle.
 * `CHECKOUT_REDIRECTED` fires once the dispatcher returns a hosted checkout
 * URL (user is about to leave the app) and carries the resolved `provider`;
 * `FAILED` fires on any failure path and carries `error_code` + `plan_id` +
 * `provider` for funnel analysis.
 */
export const SUBSCRIPTION_EVENTS = {
	/** Server returned Stripe Checkout URL — user about to redirect */
	CHECKOUT_REDIRECTED: 'Subscription Checkout Redirected',
	/** Subscribe action failed (includes error_code, plan_id) */
	FAILED: 'Subscription Failed',
	/** User opened the in-app cancel-subscription confirm dialog (client-side) */
	CANCEL_REQUESTED: 'Subscription Cancel Requested',
	/** Backend confirmed cancel-at-period-end (carries subscription_id) */
	CANCEL_CONFIRMED: 'Subscription Cancel Confirmed',
} as const;

/**
 * Fanbasis public-credit (landing page "$10 → $11 credits") funnel events.
 *
 * Tracked server-side because the entire flow is unauthenticated until the
 * magic-link callback fires — so every step before `CLAIMED` is attributed
 * to an anonymous distinct_id plus the submitted email as a property. Once
 * the session cookie lands on `/credits-claimed`, `CLAIMED` ties the prior
 * anonymous events to the real user via Mixpanel's identity merging.
 *
 * Kept in a dedicated group (not folded into `PURCHASE_EVENTS`) because
 * those funnel metrics power the authenticated checkout dashboard; mixing
 * in landing-page traffic would skew conversion rates for the core product.
 */
export const PUBLIC_CREDIT_EVENTS = {
	/**
	 * Fanbasis hosted-redirect session minted; FE is about to navigate the
	 * buyer to the upstream payment page.
	 *
	 * No `fanbasis_session_id` is forwarded — the backend's secret-mint
	 * contract intentionally exposes no session id to the FE (see
	 * `FanbasisPublicCreditCheckoutResponseDto`), so the funnel-start event
	 * carries no upstream identifier. Identity stitching happens server-side
	 * in `CLAIMED` once the magic-link callback resolves the real user id.
	 */
	CHECKOUT_STARTED: 'Public Credit Checkout Started',
	/** Checkout creation failed (includes `error_code`). */
	CHECKOUT_FAILED: 'Public Credit Checkout Failed',
	/**
	 * Magic-link callback confirmed — user is signed in and has credits.
	 * Fires once per successful landing on `/credits-claimed`.
	 */
	CLAIMED: 'Public Credit Claimed',
} as const;

/**
 * Promo code events
 * Tracked server-side — measures promo effectiveness and revenue impact
 */
export const PROMO_CODE_EVENTS = {
	/** Promo code successfully validated (includes validity result) */
	VALIDATED: 'Promo Code Validated',
	/** Promo code successfully redeemed (discount applied or tickets granted) */
	REDEEMED: 'Promo Code Redeemed',
	/** Promo code redemption failed (includes error_code) */
	REDEEM_FAILED: 'Promo Code Redeem Failed',
	/** Host bulk created promo codes for a raffle */
	BULK_CREATED: 'Promo Codes Created',
} as const;

/**
 * Winning/fulfillment events
 * Tracked server-side — measures fulfillment speed and trust
 */
export const WINNING_EVENTS = {
	/** Host marked prize as sent with proof URL */
	MARKED_SENT: 'Prize Marked Sent',
	/** Host marked prize as delivered (starts 48hr auto-confirm) */
	MARKED_DELIVERED: 'Prize Marked Delivered',
	/** Winner submitted shipping info to claim prize */
	CLAIMED: 'Winning Claimed',
	/** Winner confirmed prize was received */
	CONFIRMED_RECEIVED: 'Winning Confirmed Received',
} as const;

/**
 * Comment events
 * Tracked server-side — measures community engagement
 */
export const COMMENT_EVENTS = {
	/** User created a comment or reply */
	CREATED: 'Comment Created',
	/** User voted on a comment */
	VOTED: 'Comment Voted',
} as const;

/**
 * Review events
 * Tracked server-side — measures trust ecosystem health
 */
export const REVIEW_EVENTS = {
	/** User created a review for a raffle host */
	CREATED: 'Review Created',
} as const;

/**
 * Account health events
 * Tracked server-side — measures signup-to-verified funnel and security
 */
export const ACCOUNT_EVENTS = {
	/** User completed email verification */
	EMAIL_VERIFIED: 'Email Verified',
	/** User requested a password reset email */
	PASSWORD_RESET_REQUESTED: 'Password Reset Requested',
	/** User completed password reset with new password */
	PASSWORD_RESET_COMPLETED: 'Password Reset Completed',
	/** User verified and linked an EVM wallet */
	WALLET_VERIFIED: 'Wallet Verified',
	/** Wallet verification failed (includes error_code) */
	WALLET_VERIFICATION_FAILED: 'Wallet Verification Failed',
} as const;

/**
 * Content moderation events
 * Tracked server-side — measures trust and safety
 */
export const MODERATION_EVENTS = {
	/** User reported content for moderation */
	CONTENT_REPORTED: 'Content Reported',
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
	/** User clicked "Become a Host" CTA (exits to Google Form) */
	HOST_APPLICATION_STARTED: 'Host Application Started',
} as const;

/**
 * Notification events
 * Tracked client-side — measures notification engagement
 */
export const NOTIFICATION_EVENTS = {
	/** User clicked on an in-app notification */
	TAPPED: 'Notification Tapped',
} as const;

/**
 * KYC/Verification events
 * Tracked server-side — measures host onboarding funnel and winner claim compliance
 */
export const KYC_EVENTS = {
	/** User submitted individual KYB verification */
	INDIVIDUAL_SUBMITTED: 'KYC Individual Submitted',
	/** User submitted company KYB verification */
	COMPANY_SUBMITTED: 'KYC Company Submitted',
	/** Winner submitted KYC verification for prize claim */
	WINNER_SUBMITTED: 'KYC Winner Submitted',
	/** User finalized their verification submission */
	FINALIZED: 'KYC Submission Finalized',
	/** KYC submission failed (includes error_code, type) */
	SUBMISSION_FAILED: 'KYC Submission Failed',
} as const;
