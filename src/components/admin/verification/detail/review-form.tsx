'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { reviewSubmission } from '@/services/admin-kyc/review-submission';
import { KYC_SUBMISSION_STATUS } from '@/types/kyc-submission';

/** Max rejection reason length — prevents unbounded payloads to the backend */
const MAX_REJECTION_REASON_LENGTH = 1_000;

/**
 * Maps review error codes to admin-friendly messages.
 * Surfaces the backend reason instead of a generic "Failed to X" string.
 */
function getReviewErrorMessage(
	action: 'approve' | 'reject',
	code: string,
): string {
	switch (code) {
		case 'core:verification:already-reviewed':
			return 'This submission was already reviewed by another admin.';
		case 'core:verification:self-review':
			return 'You cannot review your own submission.';
		case 'core:verification:not-pending':
			return 'This submission is no longer in pending status.';
		case 'core:verification:not-finalized':
			return 'This submission has not been finalized yet.';
		case 'forbidden':
			return 'You do not have permission to review submissions.';
		default:
			return `Failed to ${action} submission. Please try again.`;
	}
}

interface ReviewFormProps {
	submissionId: string;
}

/**
 * ReviewForm Component
 *
 * Approve/Reject action bar for pending KYC submissions.
 * Each action opens a confirmation Dialog before submitting.
 * Rejection requires a reason — shown to the user so they
 * understand what to fix on resubmission.
 *
 * Follows the DeactivatePromoCodeModal confirmation pattern.
 *
 * @returns Action buttons with confirmation modals
 */
export function ReviewForm({ submissionId }: ReviewFormProps) {
	const router = useRouter();
	// useTransition: keeps the UI responsive during server action calls —
	// isPending disables buttons to prevent double-submit
	const [isPending, startTransition] = useTransition();

	// Which confirmation dialog is open — null when neither is shown.
	// Discriminated union avoids two separate boolean states.
	const [activeDialog, setActiveDialog] = useState<'approve' | 'reject' | null>(
		null,
	);
	// Rejection reason text — cleared on dialog close, validated before submit
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
			// Refresh to show updated status — revalidatePath in the service
			// handles cache invalidation, router.refresh re-renders server components
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

	function handleOpenApproveDialog() {
		setActiveDialog('approve');
	}

	function handleOpenRejectDialog() {
		setActiveDialog('reject');
	}

	function handleRejectionReasonChange(
		e: React.ChangeEvent<HTMLTextAreaElement>,
	) {
		setRejectionReason(e.target.value);
	}

	/** Close dialog when user dismisses — Dialog passes false on dismiss */
	function handleDialogOpenChange(open: boolean) {
		if (!open) handleClose();
	}

	return (
		<>
			{/* Action buttons */}
			<div className="flex items-center gap-3">
				<Button onClick={handleOpenApproveDialog}>Approve</Button>
				<Button variant="destructive" onClick={handleOpenRejectDialog}>
					Reject
				</Button>
			</div>

			{/* Approve confirmation dialog */}
			<Dialog
				open={activeDialog === 'approve'}
				onOpenChange={handleDialogOpenChange}
			>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Approve Submission?</DialogTitle>
						<DialogDescription>
							This will verify the user and grant them access to the associated
							features. This action can be reversed by rejecting later.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="gap-2">
						<Button
							variant="outline"
							onClick={handleClose}
							disabled={isPending}
						>
							Cancel
						</Button>
						<Button onClick={handleApprove} disabled={isPending}>
							{isPending ? (
								<>
									<Loader2 className="size-4 animate-spin" />
									Approving...
								</>
							) : (
								'Approve'
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Reject confirmation dialog */}
			<Dialog
				open={activeDialog === 'reject'}
				onOpenChange={handleDialogOpenChange}
			>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Reject Submission?</DialogTitle>
						<DialogDescription>
							Provide a reason — it will be shown to the user so they know what
							to fix when resubmitting.
						</DialogDescription>
					</DialogHeader>

					<div className="flex flex-col gap-1">
						<Textarea
							placeholder="Rejection reason (required)"
							value={rejectionReason}
							onChange={handleRejectionReasonChange}
							maxLength={MAX_REJECTION_REASON_LENGTH}
							className="min-h-24"
							disabled={isPending}
						/>
						<span className="text-muted-foreground text-right text-xs">
							{rejectionReason.length}/{MAX_REJECTION_REASON_LENGTH}
						</span>
					</div>

					<DialogFooter className="gap-2">
						<Button
							variant="outline"
							onClick={handleClose}
							disabled={isPending}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handleReject}
							disabled={isPending}
						>
							{isPending ? (
								<>
									<Loader2 className="size-4 animate-spin" />
									Rejecting...
								</>
							) : (
								'Reject'
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
