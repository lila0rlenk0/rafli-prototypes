'use client';

import { Loader2Icon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useTimeout } from '@/lib/hooks/use-timeout';
import { getReportErrorMessage } from '@/lib/errors/report-error-messages';
import { useCreateReport } from '@/services/report/use-create-report';
import type { ReportContentType } from '@/types/report';

/** Minimum reason length required by createReportSchema */
const MIN_REASON_LENGTH = 10;
/** Maximum reason length required by createReportSchema */
const MAX_REASON_LENGTH = 500;
/** Delay before resetting form — matches Radix Dialog exit animation */
const DIALOG_EXIT_ANIMATION_MS = 200;

interface ReportContentModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Type of content being reported */
	contentType: ReportContentType;
	/** ID of the specific content item */
	contentId: string;
	/** Required for comment/review/chat_message content types */
	raffleId?: string;
}

/**
 * Modal for reporting content to moderation
 *
 * Renders a textarea for the user to describe why the content
 * violates guidelines. Shows character count and validates
 * 10-500 char range before enabling submit.
 *
 * Resets form state after close animation completes (200ms delay)
 * to avoid visible content flash during dialog exit transition.
 */
export function ReportContentModal({
	open,
	onOpenChange,
	contentType,
	contentId,
	raffleId,
}: ReportContentModalProps) {
	const [reason, setReason] = useState('');
	const mutation = useCreateReport();
	const setSafeTimeout = useTimeout();

	/** Whether the reason meets minimum length */
	function isReasonValid(): boolean {
		return reason.trim().length >= MIN_REASON_LENGTH;
	}

	/** Updates reason text from textarea input */
	function handleReasonChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
		setReason(e.target.value);
	}

	/** Resets local form state after dialog close animation */
	function resetForm() {
		setSafeTimeout(() => {
			setReason('');
			mutation.reset();
		}, DIALOG_EXIT_ANIMATION_MS);
	}

	/** Handles dialog open/close — resets form on close */
	function handleOpenChange(nextOpen: boolean) {
		onOpenChange(nextOpen);
		if (!nextOpen) {
			resetForm();
		}
	}

	/** Submits the report and shows toast feedback */
	function handleSubmit() {
		mutation.mutate(
			{
				contentType,
				contentId,
				raffleId,
				reason: reason.trim(),
			},
			{
				onSuccess() {
					toast.success('Report submitted. Our team will review it shortly.');
					handleOpenChange(false);
				},
				onError(error) {
					toast.error(getReportErrorMessage(error.code));
				},
			},
		);
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Report Content</DialogTitle>
					<DialogDescription>
						Please describe why this content violates our guidelines.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3">
					<Textarea
						value={reason}
						onChange={handleReasonChange}
						placeholder="Describe the issue (minimum 10 characters)..."
						maxLength={MAX_REASON_LENGTH}
						rows={4}
						disabled={mutation.isPending}
					/>

					<div className="flex items-center justify-between">
						<span className="text-xs text-gray-400">
							{reason.length}/{MAX_REASON_LENGTH}
						</span>

						<Button
							onClick={handleSubmit}
							disabled={!isReasonValid() || mutation.isPending}
							size="sm"
						>
							{mutation.isPending && (
								<Loader2Icon className="mr-1.5 size-3.5 animate-spin" />
							)}
							Submit Report
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
