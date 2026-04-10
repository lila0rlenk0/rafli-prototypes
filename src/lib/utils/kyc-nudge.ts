import type { VerificationStatus } from '@/types/verification-status';
import type { WinningStatus } from '@/types/winning';

// ==========================================
// Types
// ==========================================

/**
 * KYC statuses that require the nudge to render.
 * Excludes 'approved' — approved users don't need the nudge.
 */
export type ActionableKycStatus = Exclude<VerificationStatus, 'approved'>;

/** Rendered strings for the actionable KYC nudge variants. */
export interface KycNudgeCopy {
	title: string;
	body: string;
	cta: string;
}

interface ShouldShowKycNudgeInput {
	/** Whether the viewer is the raffle host — hosts never see the nudge */
	isHost: boolean;
	/** Current kyc_winner status, or null when fetch failed / host view */
	kycStatus: null | VerificationStatus;
	/** Winning lifecycle status — nudge only renders while claim is pending */
	winningStatus: WinningStatus;
}

// ==========================================
// Visibility
// ==========================================

/**
 * Decides whether the KYC nudge should render for a winner.
 *
 * Only visible when:
 * - Viewer is a winner (not host)
 * - KYC status was successfully fetched
 * - KYC is not already approved
 * - The winning is still in the claim-pending phase (pre-claim)
 *
 * Returning `null` hides the nudge. Returning a status narrows the type so
 * downstream consumers can match on actionable states without re-checking
 * the 'approved' case.
 *
 * @param input - Viewer, KYC, and winning status
 * @returns The actionable KYC status, or null to hide
 */
export function resolveKycNudgeStatus({
	isHost,
	kycStatus,
	winningStatus,
}: ShouldShowKycNudgeInput): ActionableKycStatus | null {
	// Step 1: Host view — never show the winner-facing nudge.
	if (isHost) return null;

	// Step 2: Missing status data — can't render per-state copy.
	if (kycStatus == null) return null;

	// Step 3: Already approved — nothing to nudge about.
	if (kycStatus === 'approved') return null;

	// Step 4: Post-claim phases — the claim action is no longer relevant.
	// Both legacy and current pending statuses signal "winner hasn't claimed yet".
	const isClaimPending =
		winningStatus === 'pending' ||
		winningStatus === 'pending_partial_fulfillment';
	if (!isClaimPending) return null;

	return kycStatus;
}

// ==========================================
// Copy
// ==========================================

/** Per-status copy for actionable KYC nudges (none, draft, rejected). */
const ACTIONABLE_COPY = {
	none: {
		title: 'Identity verification required',
		body: 'To receive your prize, we need to verify your identity. This is a one-time step that takes a few minutes.',
		cta: 'Verify identity',
	},
	// U+2019 right single quotation mark — avoids escaping issues in JSX and copy
	draft: {
		title: 'Complete your verification',
		body: 'You started verifying your identity but didn\u2019t finish. Pick up where you left off to unlock your prize.',
		cta: 'Resume verification',
	},
	rejected: {
		title: 'Verification was rejected',
		body: 'Your previous submission was rejected. Please review the feedback and submit again to receive your prize.',
		cta: 'Re-submit verification',
	},
} as const satisfies Record<
	Exclude<ActionableKycStatus, 'in_review'>,
	KycNudgeCopy
>;

/**
 * Returns the title, body, and CTA for the actionable KYC nudge variants.
 * The `in_review` status is informational and handled by the caller directly —
 * narrowing the parameter type enforces that at compile time.
 *
 * @param status - One of 'none' | 'draft' | 'rejected'
 * @returns Copy for the nudge banner
 */
export function getKycNudgeCopy(
	status: Exclude<ActionableKycStatus, 'in_review'>,
): KycNudgeCopy {
	return ACTIONABLE_COPY[status];
}
