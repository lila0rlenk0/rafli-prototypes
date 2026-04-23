'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition, type ChangeEvent } from 'react';
import { toast } from 'sonner';

import { ApproveConfirmDialog } from '@/components/admin/verification/detail/review-form/approve-confirm-dialog';
import { RejectConfirmDialog } from '@/components/admin/verification/detail/review-form/reject-confirm-dialog';
import { getReviewErrorMessage } from '@/components/admin/verification/detail/review-form/error-messages';
import { Button } from '@/components/ui/button';
import { reviewSubmission } from '@/services/admin-kyc/review-submission';
import { KYC_SUBMISSION_STATUS } from '@/types/kyc-submission';

/** Max rejection reason length — prevents unbounded payloads to the backend. */
const MAX_REJECTION_REASON_LENGTH = 1_000;

interface ReviewFormProps {
	submissionId: string;
}

/**
 * ReviewForm — approve/reject action bar for pending KYC submissions.
 * Each action opens a confirmation dialog before submitting; rejection
 * requires a reason that is surfaced back to the user on resubmit.
 *
 * @returns Action buttons with confirmation modals.
 */
export function ReviewForm({ submissionId }: ReviewFormProps) {
	const router = useRouter();
	// useTransition: keeps UI responsive during server-action calls —
	// `isPending` disables buttons to prevent double submission.
	const [isPending, startTransition] = useTransition();
	// Discriminated union avoids two separate boolean states.
	const [activeDialog, setActiveDialog] = useState<'approve' | 'reject' | null>(
		null,
	);
	const [rejectionReason, setRejectionReason] = useState('');

	function handleApprove() {
		startTransition(async () => {
			const result = await reviewSubmission(submissionId, {
				decision: KYC_SUBMISSION_STATUS.APPROVED,
			});

			if (!result.success) {
				toast.error(getReviewErrorMessage('approve', result.error));
				return;
			}

			toast.success('Submission approved');
			setActiveDialog(null);
			// Service already revalidates the cache; refresh re-renders server
			// components that fetched the previous status.
			router.refresh();
		});
	}

	function handleReject() {
		if (!rejectionReason.trim()) {
			toast.error('Please provide a rejection reason');
			return;
		}

		startTransition(async () => {
			const result = await reviewSubmission(submissionId, {
				decision: KYC_SUBMISSION_STATUS.REJECTED,
				rejectionReason: rejectionReason.trim(),
			});

			if (!result.success) {
				toast.error(getReviewErrorMessage('reject', result.error));
				return;
			}

			toast.success('Submission rejected');
			setActiveDialog(null);
			setRejectionReason('');
			router.refresh();
		});
	}

	function handleClose() {
		if (isPending) return;
		setActiveDialog(null);
		setRejectionReason('');
	}

	const handleDialogOpenChange = (open: boolean) => {
		if (!open) handleClose();
	};

	function handleRejectionReasonChange(
		event: ChangeEvent<HTMLTextAreaElement>,
	) {
		setRejectionReason(event.target.value);
	}

	return (
		<>
			<div className="flex items-center gap-3">
				<Button onClick={() => setActiveDialog('approve')}>Approve</Button>
				<Button variant="destructive" onClick={() => setActiveDialog('reject')}>
					Reject
				</Button>
			</div>

			<ApproveConfirmDialog
				open={activeDialog === 'approve'}
				isPending={isPending}
				onOpenChange={handleDialogOpenChange}
				onConfirm={handleApprove}
				onCancel={handleClose}
			/>

			<RejectConfirmDialog
				open={activeDialog === 'reject'}
				isPending={isPending}
				rejectionReason={rejectionReason}
				maxLength={MAX_REJECTION_REASON_LENGTH}
				onOpenChange={handleDialogOpenChange}
				onReasonChange={handleRejectionReasonChange}
				onConfirm={handleReject}
				onCancel={handleClose}
			/>
		</>
	);
}
