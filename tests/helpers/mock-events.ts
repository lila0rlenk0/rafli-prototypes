/**
 * Complete mock for @/lib/analytics/events.
 *
 * Bun's mock.module() is process-global — if any test file mocks @/lib/analytics/events
 * with only a subset of event constants, all other test files importing the module
 * will get "Export named 'X' not found" errors.
 *
 * Every test file that mocks @/lib/analytics/events MUST use this complete mock
 * to prevent cross-contamination.
 */
export const MOCK_ANALYTICS_EVENTS = {
	AUTH_EVENTS: {
		SIGN_UP_STARTED: 'Sign Up Started',
		SIGN_UP_COMPLETED: 'Sign Up Completed',
		SIGN_UP_FAILED: 'Sign Up Failed',
		SIGN_IN_STARTED: 'Sign In Started',
		SIGN_IN_COMPLETED: 'Sign In Completed',
		SIGN_IN_FAILED: 'Sign In Failed',
		SIGN_OUT: 'Sign Out',
	},
	RAFFLE_EVENTS: {
		VIEWED: 'Raffle Viewed',
		SHARED: 'Raffle Shared',
		FILTERED: 'Raffle Filtered',
		QUESTION_ANSWERED: 'Raffle Question Answered',
		CREATE_STARTED: 'Raffle Create Started',
		CREATE_STEP_COMPLETED: 'Raffle Create Step Completed',
		CREATED: 'Raffle Created',
		CREATE_FAILED: 'Raffle Create Failed',
		COVER_UPLOADED: 'Raffle Cover Uploaded',
		GALLERY_UPLOADED: 'Raffle Gallery Uploaded',
		PUBLISHED: 'Raffle Published',
		UNPUBLISHED: 'Raffle Unpublished',
		UPDATED: 'Raffle Updated',
		UPDATE_POSTED: 'Raffle Update Posted',
	},
	X_SHARE_EVENTS: {
		INTENT_CREATED: 'X Share Intent Created',
		VERIFIED: 'X Share Verified',
		VERIFICATION_FAILED: 'X Share Verification Failed',
	},
	PURCHASE_EVENTS: {
		TICKET_SELECTION_VIEWED: 'Ticket Selection Viewed',
		STARTED: 'Purchase Started',
		ORDER_CREATED: 'Order Created',
		ORDER_FAILED: 'Order Failed',
		CHECKOUT_STARTED: 'Checkout Started',
		COMPLETED: 'Purchase Completed',
		FAILED: 'Purchase Failed',
		CRYPTO_CHECKOUT_STARTED: 'Crypto Checkout Started',
		CRYPTO_TX_SUBMITTED: 'Crypto Transaction Submitted',
		CRYPTO_TX_CONFIRMED: 'Crypto Transaction Confirmed',
		ORDER_ABANDONED: 'Order Abandoned',
	},
	PROMO_CODE_EVENTS: {
		VALIDATED: 'Promo Code Validated',
		REDEEMED: 'Promo Code Redeemed',
		REDEEM_FAILED: 'Promo Code Redeem Failed',
		BULK_CREATED: 'Promo Codes Created',
	},
	WINNING_EVENTS: {
		MARKED_SENT: 'Prize Marked Sent',
		MARKED_DELIVERED: 'Prize Marked Delivered',
		CLAIMED: 'Winning Claimed',
		CONFIRMED_RECEIVED: 'Winning Confirmed Received',
	},
	COMMENT_EVENTS: {
		CREATED: 'Comment Created',
		VOTED: 'Comment Voted',
	},
	REVIEW_EVENTS: {
		CREATED: 'Review Created',
	},
	ACCOUNT_EVENTS: {
		EMAIL_VERIFIED: 'Email Verified',
		PASSWORD_RESET_REQUESTED: 'Password Reset Requested',
		PASSWORD_RESET_COMPLETED: 'Password Reset Completed',
		WALLET_VERIFIED: 'Wallet Verified',
		WALLET_VERIFICATION_FAILED: 'Wallet Verification Failed',
	},
	MODERATION_EVENTS: {
		CONTENT_REPORTED: 'Content Reported',
	},
	PROFILE_EVENTS: {
		VIEWED: 'Profile Viewed',
		MODE_SWITCHED: 'Mode Switched',
		HOST_APPLICATION_STARTED: 'Host Application Started',
	},
	NOTIFICATION_EVENTS: {
		TAPPED: 'Notification Tapped',
	},
	KYC_EVENTS: {
		INDIVIDUAL_SUBMITTED: 'KYC Individual Submitted',
		COMPANY_SUBMITTED: 'KYC Company Submitted',
		WINNER_SUBMITTED: 'KYC Winner Submitted',
		FINALIZED: 'KYC Submission Finalized',
		SUBMISSION_FAILED: 'KYC Submission Failed',
	},
};
